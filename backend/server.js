const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
// Add this line near your other imports at the top of server.js
const mammoth = require('mammoth');

dotenv.config();

// 1. Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5001;

// 2. Middleware Configuration
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// 3. Configure Multer for File Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the 'uploads' directory exists
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Use a unique name for the uploaded file: userId-timestamp.pdf
        const userId = req.body.userId;
        const extension = path.extname(file.originalname);
        cb(null, `${userId}-${Date.now()}${extension}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// =========================================================================
// 4. CORE MATCHING UTILITY & GEMINI HELPERS
// =========================================================================

const matchResumeToJob = (resumeText, jobSkillsString) => {
  const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s,]/g, ' ').replace(/\s+/g, ' ').trim();

  const normalizedResume = normalize(resumeText);
  
  const requiredSkills = jobSkillsString
    .toLowerCase()
    .split(',')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);

  if (requiredSkills.length === 0) {
    return { matchScore: 100, matchedSkills: [], missingSkills: [] };
  }

  let matchedSkills = [];
  let missingSkills = [];

  requiredSkills.forEach(skill => {
    if (normalizedResume.includes(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return { matchScore, matchedSkills, missingSkills };
};

// --- Helper function for making Gemini API calls ---
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; // Loaded from .env

const generateGeminiContent = async (systemPrompt, userQuery) => {
    if (!GEMINI_API_KEY && !process.env.CANVAS_MODE) {
        throw new Error("GEMINI_API_KEY is not set.");
    }
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const response = await fetch(GEMINI_API_URL + GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        console.error("Gemini Response Error:", result);
        throw new Error("Gemini returned no text content or encountered an API error.");
    }
    return text;
};


// =========================================================================
// 5. API ENDPOINTS
// =========================================================================

// --- A. Job Management (Routes unchanged from previous) ---
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


// --- B. Resume Upload and Download (Routes unchanged from previous) ---

// POST endpoint for resume upload - NOW HANDLES PDF, DOCX, TXT
app.post('/api/resumes/upload', upload.single('resume'), async (req, res) => {
    const { userId } = req.body;
    const filePath = req.file ? req.file.path : null; 
    let resumeText = '';

    if (!userId || !filePath) {
        // ... (standard error and cleanup) ...
        return res.status(400).send({ message: 'User ID or file is missing.' });
    }

    try {
        const dataBuffer = fs.readFileSync(filePath);
        const fileMimeType = req.file.mimetype;

        // 1. CONDITIONAL PARSING LOGIC
        if (fileMimeType === 'application/pdf') {
            // PDF: Use pdf-parse
            const data = await pdf(dataBuffer);
            resumeText = data.text;

        } else if (fileMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // DOCX: Use mammoth
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            resumeText = result.value;

        } else if (fileMimeType === 'text/plain') {
            // TXT: Convert buffer directly
            resumeText = dataBuffer.toString('utf-8');

        } else {
            // Unsupported file type
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }

        if (!resumeText.trim()) {
            throw new Error('Could not extract text from the document. Please ensure the file is not corrupted.');
        }

        // 2. Save resume text and file path to Firestore
        const docRef = db.collection('resumes').doc(userId);
        await docRef.set({
            userId,
            resumeText, 
            uploadedAt: new Date().toISOString(),
            filePath: filePath 
        }, { merge: true });

        res.status(200).send({ message: 'Resume uploaded and processed successfully.' });

    } catch (error) {
        console.error('Error processing or saving resume:', error);
        // Clean up the file if processing fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        // Send a specific error back to the client if parsing failed
        res.status(500).send({ message: `Processing failed: ${error.message}` });
    }
});

app.get('/api/resumes/download/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const docRef = db.collection('resumes').doc(userId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).send({ message: 'Resume metadata not found.' });
        }
        
        const filePath = docSnap.data().filePath;

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).send({ message: 'File not found on server.' });
        }

        res.setHeader('Content-Type', 'application/pdf');

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error serving resume file:', error);
        res.status(500).send({ message: 'Failed to retrieve file.' });
    }
});


// --- C. Matching and Ranking (Routes unchanged from previous) ---

app.get('/api/match/:jobId/:userId', async (req, res) => {
  try {
    const { jobId, userId } = req.params;

    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).send({ message: 'Job not found.' });
    }
    const jobSkills = jobDoc.data().skills;

    const resumeDoc = await db.collection('resumes').doc(userId).get();
    if (!resumeDoc.exists || !resumeDoc.data().resumeText) {
      return res.status(404).send({ message: 'Resume not found for this user.' });
    }
    const resumeText = resumeDoc.data().resumeText;

    const result = matchResumeToJob(resumeText, jobSkills);

    res.status(200).send(result);

  } catch (error) {
    console.error('Error calculating match score:', error);
    res.status(500).send({ message: 'Internal server error during match analysis.' });
  }
});

app.get('/api/applicants/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).send({ message: 'Job not found.' });
    }
    const jobSkills = jobDoc.data().skills;

    const resumesSnapshot = await db.collection('resumes').get();
    const usersSnapshot = await db.collection('users').get(); 

    const usersMap = usersSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data();
      return acc;
    }, {});

    const applicantsList = [];

    for (const resumeDoc of resumesSnapshot.docs) {
      const userId = resumeDoc.id;
      const resumeText = resumeDoc.data().resumeText;
      const userDetails = usersMap[userId];

      if (userDetails && userDetails.role === 'Job Seeker') {
        const matchResult = matchResumeToJob(resumeText, jobSkills);
        
        applicantsList.push({
          userId: userId,
          email: userDetails.email,
          matchScore: matchResult.matchScore,
          matchedSkills: matchResult.matchedSkills,
        });
      }
    }

    applicantsList.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).send(applicantsList);

  } catch (error) {
    console.error('Error fetching and ranking applicants:', error);
    res.status(500).send({ message: 'Internal server error during applicant ranking.' });
  }
});

// --- D. AI Features (Job Seeker) ---

// POST /api/ai/coverletter - Generates a personalized cover letter
app.post('/api/ai/coverletter', async (req, res) => {
    const { userId, jobTitle, jobDescription, company } = req.body;

    if (!userId) return res.status(400).send({ message: 'User ID is required.' });

    try {
        const resumeDoc = await db.collection('resumes').doc(userId).get();
        if (!resumeDoc.exists || !resumeDoc.data().resumeText) {
            return res.status(404).send({ message: 'Please upload your resume first to generate a cover letter.' });
        }
        const resumeText = resumeDoc.data().resumeText;

        const systemPrompt = "You are a professional career coach and copywriter. Your task is to generate a concise, single-page cover letter based on the provided resume and job details. Focus only on the most relevant experience and skills that match the job description.";
        
        const userQuery = `Using the following resume text, write a cover letter for the job titled "${jobTitle}" at "${company}". The job description is: "${jobDescription}". Resume Text: "${resumeText}". Only return the body of the letter, starting with the salutation and ending with the closing.`;

        const letterText = await generateGeminiContent(systemPrompt, userQuery);
        res.status(200).send({ text: letterText });

    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).send({ message: 'Failed to generate cover letter via AI.' });
    }
});


// POST /api/ai/suggestions - Provides personalized job recommendations
app.post('/api/ai/suggestions', async (req, res) => {
    const { userId, allJobs } = req.body;

    if (!userId || !allJobs || allJobs.length === 0) {
        return res.status(400).send({ message: 'User ID and available jobs are required.' });
    }

    try {
        const resumeDoc = await db.collection('resumes').doc(userId).get();
        if (!resumeDoc.exists || !resumeDoc.data().resumeText) {
            return res.status(404).send({ message: 'Please upload your resume first for personalized recommendations.' });
        }
        const resumeText = resumeDoc.data().resumeText;

        const jobListString = allJobs.map(job => 
            `ID: ${job.id}, Title: ${job.title}, Skills: ${job.skills}`
        ).join('; ');

        const systemPrompt = "You are a job recommendation engine. Analyze the Resume Text and the list of available jobs. Select the top 3 job IDs that are the *best semantic fit* for the candidate's experience. Return ONLY a JSON array of the recommended job IDs, using the format: [\"ID_1\", \"ID_2\", \"ID_3\"].";

        const userQuery = `Candidate Resume Text: "${resumeText}". Available Jobs (ID, Title, Skills): ${jobListString}.`;

        const jsonResponse = await generateGeminiContent(systemPrompt, userQuery);
        
        let recommendedIds = [];
        try {
            recommendedIds = JSON.parse(jsonResponse.trim());
            if (!Array.isArray(recommendedIds)) {
                throw new Error("Parsed content is not an array.");
            }
        } catch (e) {
             console.warn("AI returned malformed JSON, returning empty suggestions.", jsonResponse);
             // Return empty suggestions if the AI doesn't produce perfect JSON
             return res.status(200).send({ suggestions: [] });
        }

        res.status(200).send({ suggestions: recommendedIds });

    } catch (error) {
        console.error('Error fetching job suggestions:', error);
        res.status(500).send({ message: 'Failed to fetch suggestions via AI.' });
    }
});

// POST /api/ai/interview - Generates behavioral interview questions
app.post('/api/ai/interview', async (req, res) => {
    const { userId, jobTitle, jobDescription } = req.body;

    if (!userId) return res.status(400).send({ message: 'User ID is required.' });

    try {
        const resumeDoc = await db.collection('resumes').doc(userId).get();
        if (!resumeDoc.exists || !resumeDoc.data().resumeText) {
            return res.status(404).send({ message: 'Please upload your resume first to generate interview questions.' });
        }
        const resumeText = resumeDoc.data().resumeText;

        const systemPrompt = "You are an expert HR interviewer. Your task is to generate 5 challenging and specific behavioral interview questions (using the STAR method format) that are tailored to the candidate's resume and the job requirements. Format the output as a numbered list of questions, with no introductory text.";
        
        const userQuery = `Generate 5 behavioral interview questions for the job titled "${jobTitle}". The job description is: "${jobDescription}". The candidate's Resume Text is: "${resumeText}".`;

        const questionsText = await generateGeminiContent(systemPrompt, userQuery);
        res.status(200).send({ text: questionsText });

    } catch (error) {
        console.error('Error generating interview questions:', error);
        res.status(500).send({ message: 'Failed to generate interview questions via AI.' });
    }
});


// 6. Start the Server
app.listen(PORT, () => {
  console.log(`Smart Analyzer Backend running on port ${PORT}`);
});
