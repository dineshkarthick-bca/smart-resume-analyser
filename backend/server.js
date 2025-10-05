// 1. Core Imports
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

// File upload and PDF parsing libraries
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Load environment variables (for the port number)
dotenv.config();

// 2. Initialize Firebase Admin SDK
// The serviceAccountKey.json is the downloaded key from Firebase Console (Phase 1)
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5001;

// 3. Middleware Configuration
// Use CORS to allow requests from the frontend (running on a different port)
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json()); // Body parser for JSON data
app.use(express.urlencoded({ extended: true })); // Body parser for URL encoded data

// Configure Multer for file upload (storing the file in memory temporarily)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// =========================================================================
// 4. CORE MATCHING UTILITY (Phase 5)
// =========================================================================

/**
 * Compares a resume's text content against a job's required skills.
 * @param {string} resumeText - The raw text extracted from the user's PDF resume.
 * @param {string} jobSkillsString - A comma-separated string of required skills (e.g., "React, Node.js, Firebase").
 * @returns {{matchScore: number, matchedSkills: string[], missingSkills: string[]}}
 */
const matchResumeToJob = (resumeText, jobSkillsString) => {
  // Helper to normalize text (lowercase and remove most punctuation/symbols)
  const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s,]/g, ' ').replace(/\s+/g, ' ').trim();

  const normalizedResume = normalize(resumeText);
  
  // Process job skills into a clean array
  const requiredSkills = jobSkillsString
    .toLowerCase()
    .split(',')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);

  if (requiredSkills.length === 0) {
    // If the job requires no skills, it's a 100% match
    return { matchScore: 100, matchedSkills: [], missingSkills: [] };
  }

  let matchedSkills = [];
  let missingSkills = [];

  // Check for skill presence
  requiredSkills.forEach(skill => {
    // We use .includes() for simple substring matching
    if (normalizedResume.includes(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  // Calculate score as a percentage and round it
  const matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return { matchScore, matchedSkills, missingSkills };
};

// =========================================================================
// 5. API ENDPOINTS
// =========================================================================

// --- A. Job Management (Phase 3 & 4) ---

// POST /api/jobs - Recruiter: Creates a new job posting
app.post('/api/jobs', async (req, res) => {
  try {
    const { title, company, description, skills, recruiterId } = req.body;
    if (!title || !recruiterId) {
      return res.status(400).send({ message: 'Missing required job fields.' });
    }

    const newJob = {
      title,
      company,
      description,
      skills: skills || '',
      recruiterId,
      postedOn: new Date().toISOString()
    };

    const docRef = await db.collection('jobs').add(newJob);
    res.status(201).send({ id: docRef.id, ...newJob });

  } catch (error) {
    console.error('Error posting job:', error);
    res.status(500).send({ message: 'Internal server error while posting job.' });
  }
});

// GET /api/jobs/my-jobs/:recruiterId - Recruiter: Fetches all jobs posted by a specific recruiter
app.get('/api/jobs/my-jobs/:recruiterId', async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const snapshot = await db.collection('jobs').where('recruiterId', '==', recruiterId).get();
    
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(jobs);
  } catch (error) {
    console.error('Error fetching recruiter jobs:', error);
    res.status(500).send({ message: 'Internal server error while fetching jobs.' });
  }
});

// DELETE /api/jobs/:jobId - Recruiter: Deletes a specific job posting
app.delete('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    await db.collection('jobs').doc(jobId).delete();
    res.status(200).send({ message: 'Job successfully deleted.' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).send({ message: 'Internal server error while deleting job.' });
  }
});

// GET /api/jobs - Job Seeker: Fetches all available jobs (for Job Board)
app.get('/api/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection('jobs').get();
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).send(jobs);
  } catch (error) {
    console.error('Error fetching all jobs:', error);
    res.status(500).send({ message: 'Internal server error while fetching jobs.' });
  }
});

// GET /api/jobs/:jobId - Fetches details for a single job
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const doc = await db.collection('jobs').doc(jobId).get();

    if (!doc.exists) {
      return res.status(404).send({ message: 'Job not found.' });
    }

    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching single job:', error);
    res.status(500).send({ message: 'Internal server error while fetching job.' });
  }
});


// --- B. Resume Upload (Phase 4) ---

// POST /api/resumes/upload - Job Seeker: Uploads PDF, parses text, saves to Firestore
app.post('/api/resumes/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file || !req.body.userId) {
      return res.status(400).send({ message: 'Missing file or user ID.' });
    }

    // 1. Parse PDF file from the buffer
    const data = await pdf(req.file.buffer);
    const resumeText = data.text;

    // 2. Save the extracted text to Firestore, linked to the user's ID
    const userId = req.body.userId;
    const docRef = db.collection('resumes').doc(userId);
    
    await docRef.set({
      userId: userId,
      resumeText: resumeText,
      uploadedAt: new Date().toISOString()
    }, { merge: true }); // Use merge:true to update if the user uploads a new resume

    res.status(200).send({ message: 'Resume uploaded and processed successfully.' });

  } catch (error) {
    console.error('Error processing PDF upload:', error);
    res.status(500).send({ message: 'Failed to process resume file.' });
  }
});


// --- C. Matching and Ranking (Phase 5 & 6) ---

// GET /api/match/:jobId/:userId - Job Seeker: Calculates match score for one user/job pair
app.get('/api/match/:jobId/:userId', async (req, res) => {
  try {
    const { jobId, userId } = req.params;

    // 1. Fetch Job Requirements
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).send({ message: 'Job not found.' });
    }
    const jobSkills = jobDoc.data().skills;

    // 2. Fetch Resume Text
    const resumeDoc = await db.collection('resumes').doc(userId).get();
    if (!resumeDoc.exists || !resumeDoc.data().resumeText) {
      // Critical for the frontend error handling in MatchAnalysis.jsx
      return res.status(404).send({ message: 'Resume not found for this user.' });
    }
    const resumeText = resumeDoc.data().resumeText;

    // 3. Calculate Match
    const result = matchResumeToJob(resumeText, jobSkills);

    res.status(200).send(result);

  } catch (error) {
    console.error('Error calculating match score:', error);
    res.status(500).send({ message: 'Internal server error during match analysis.' });
  }
});

// GET /api/applicants/:jobId - Recruiter: Fetches all applicants and returns a ranked list
app.get('/api/applicants/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // 1. Fetch Job Requirements
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).send({ message: 'Job not found.' });
    }
    const jobSkills = jobDoc.data().skills;

    // 2. Fetch ALL uploaded resumes
    const resumesSnapshot = await db.collection('resumes').get();
    const usersSnapshot = await db.collection('users').get(); // Fetch user emails for display

    const usersMap = usersSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data();
      return acc;
    }, {});

    const applicantsList = [];

    // 3. Iterate through resumes, calculate score, and build applicant object
    for (const resumeDoc of resumesSnapshot.docs) {
      const userId = resumeDoc.id;
      const resumeText = resumeDoc.data().resumeText;
      const userDetails = usersMap[userId];

      // Only process resumes belonging to users that exist in the 'users' collection (logged-in users)
      if (userDetails && userDetails.role === 'Job Seeker') {
        const matchResult = matchResumeToJob(resumeText, jobSkills);
        
        applicantsList.push({
          userId: userId,
          email: userDetails.email, // Use the stored email for display
          matchScore: matchResult.matchScore,
          matchedSkills: matchResult.matchedSkills,
          // Note: missingSkills is not required by ApplicantsPage but is useful for logging
        });
      }
    }

    // 4. Sort the list by matchScore (highest score first)
    applicantsList.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).send(applicantsList);

  } catch (error) {
    console.error('Error fetching and ranking applicants:', error);
    res.status(500).send({ message: 'Internal server error during applicant ranking.' });
  }
});


// 6. Start the Server
app.listen(PORT, () => {
  console.log(`Smart Analyzer Backend running on port ${PORT}`);
});
