import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MatchAnalysis from '../components/MatchAnalysis'; // Import the matching component

/**
 * JobDetailPage component displays the full details of a single job.
 * It also conditionally renders the MatchAnalysis and AI tools for Job Seekers.
 */
function JobDetailPage() {
  // Get the jobId from the URL parameters
  const { jobId } = useParams();
  
  // Get the current user and their role
  const { currentUser } = useAuth();

  // State for the fetched job data
  const [job, setJob] = useState(null);
  // State for managing general loading status
  const [loading, setLoading] = useState(true);
  // State for displaying errors
  const [error, setError] = useState('');
  
  // State for Cover Letter Tool
  const [coverLetter, setCoverLetter] = useState('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState('');

  // State for Interview Questions Tool
  const [interviewQuestions, setInterviewQuestions] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState('');

  // --- Fetch Job Details on Mount ---
  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      setError('');
      
      if (!jobId) {
        setError('No job ID provided.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5001/api/jobs/${jobId}`);
        setJob(response.data);
      } catch (err) {
        setError('Failed to fetch job details. The job may have been deleted.');
        console.error('Error fetching job details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  // --- AI Functions ---

  const handleGenerateCoverLetter = async () => {
    setLetterError('');
    setIsGeneratingLetter(true);

    try {
      const response = await axios.post('http://localhost:5001/api/ai/coverletter', {
        userId: currentUser.uid,
        jobTitle: job.title,
        jobDescription: job.description,
        company: job.company
      });
      // Replace newlines with <br> for better display in JSX
      setCoverLetter(response.data.text.replace(/\n/g, '<br/>'));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate cover letter. Ensure your resume is uploaded.';
      setLetterError(msg);
    } finally {
      setIsGeneratingLetter(false);
    }
  };
  
  const handleGenerateQuestions = async () => {
    setQuestionsError('');
    setIsGeneratingQuestions(true);

    try {
      const response = await axios.post('http://localhost:5001/api/ai/interview', {
        userId: currentUser.uid,
        jobTitle: job.title,
        jobDescription: job.description,
      });
      // The AI should return a numbered list, which we can display directly.
      setInterviewQuestions(response.data.text.trim());
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate interview questions. Ensure your resume is uploaded.';
      setQuestionsError(msg);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };


  // --- Render Logic ---

  if (loading) {
    return <div className="page-container"><p>Loading job details...</p></div>;
  }

  if (error) {
    return <div className="page-container error-message"><h3>Error</h3><p>{error}</p></div>;
  }

  if (!job) {
    return <div className="page-container"><h3>Job Not Found</h3><p>The requested job posting does not exist.</p></div>;
  }
  
  const isJobSeeker = currentUser?.role === 'Job Seeker';

  return (
    <div className="page-container job-detail-page">
      <h1>{job.title}</h1>
      <p className="company-name-detail">Posted by <strong>{job.company}</strong></p>
      <p className="posted-date">Posted: {new Date(job.postedOn).toLocaleDateString()}</p>

      <hr className="divider" />
      
      {/* Job Description Section */}
      <section className="job-description-section">
        <h2>Job Description</h2>
        <p className="description-text">{job.description}</p>
      </section>

      {/* Required Skills Section */}
      <section className="required-skills-section">
        <h2>Required Skills</h2>
        <div className="skills-tags">
          {job.skills.split(',').map((skill, index) => (
            <span key={index} className="skill-tag">{skill.trim()}</span>
          ))}
        </div>
      </section>

      <hr className="divider" />
      
      {/* --- Conditional Match Analysis & AI Tools for Job Seekers --- */}
      {isJobSeeker ? (
        <div className="seeker-tools">
          
          {/* 1. Match Analysis (Keyword-based) */}
          <section className="match-analysis-section">
            <h2>Analysing Result :</h2>
            <MatchAnalysis jobId={job.id} />
          </section>

          <hr className="divider" />

          {/* 2. Cover Letter Drafting Tool (AI) */}
          <section className="ai-tool-box cover-letter-tool">
            <h3>Cover Letter Generator</h3>
            <p>Generate a cover letter draft based on your uploaded resume and this job description using AI.</p>
            <button 
              onClick={handleGenerateCoverLetter} 
              disabled={isGeneratingLetter}
              className="btn-ai-action"
            >
              {isGeneratingLetter ? 'Generating...' : 'Generate Cover Letter'}
            </button>
            {letterError && <p className="error-message">{letterError}</p>}
            {coverLetter && (
              <div className="ai-output-area cover-letter-output">
                <h4>Generated Letter:</h4>
                <div dangerouslySetInnerHTML={{ __html: coverLetter }} />
              </div>
            )}
          </section>

          <hr className="divider" />

          {/* 3. Behavioral Interview Question Generator (AI) */}
          <section className="ai-tool-box interview-coach-tool">
            <h3>Mock Interview</h3>
            <p>Generate personalized behavioral questions to prepare for your interview by AI.</p>
            <button 
              onClick={handleGenerateQuestions} 
              disabled={isGeneratingQuestions}
              className="btn-ai-action"
            >
              {isGeneratingQuestions ? 'Preparing...' : 'Generate Questions'}
            </button>
            {questionsError && <p className="error-message">{questionsError}</p>}
            {interviewQuestions && (
              <div className="ai-output-area interview-coach-output">
                <h4>Questions:</h4>
                {/* Render the numbered list output directly */}
                <div dangerouslySetInnerHTML={{ __html: interviewQuestions.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="match-analysis-placeholder">
          <p>Log in as a <strong>Job Seeker</strong> and upload a resume to view the Smart Match Analysis and AI tools!</p>
        </section>
      )}

    </div>
  );
}

export default JobDetailPage;
