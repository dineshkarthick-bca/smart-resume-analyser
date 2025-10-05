import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MatchAnalysis from '../components/MatchAnalysis'; // Import the matching component

/**
 * JobDetailPage component displays the full details of a single job.
 * It also conditionally renders the MatchAnalysis for Job Seekers.
 */
function JobDetailPage() {
  // Get the jobId from the URL parameters
  const { jobId } = useParams();
  
  // Get the current user and their role
  const { currentUser } = useAuth();

  // State for the fetched job data
  const [job, setJob] = useState(null);
  // State for managing loading status
  const [loading, setLoading] = useState(true);
  // State for displaying error messages
  const [error, setError] = useState('');

  useEffect(() => {
    // Function to fetch the specific job posting
    const fetchJobDetails = async () => {
      setLoading(true);
      setError('');
      
      if (!jobId) {
        setError('No job ID provided.');
        setLoading(false);
        return;
      }

      try {
        // API endpoint to fetch a single job by its ID
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
  }, [jobId]); // Re-fetch if the jobId changes

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
  
  // Determine if the current user is a Job Seeker
  const isJobSeeker = currentUser?.role === 'Job Seeker';

  return (
    <div className="page-container job-detail-page">
      <h1>{job.title}</h1>
      <p className="company-name-detail">Posted by {job.company}</p>
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
      
      {/* --- Conditional Match Analysis for Job Seekers --- */}
      {isJobSeeker ? (
        <section className="match-analysis-section">
          <h2>Smart Analyzer: See Your Fit</h2>
          <MatchAnalysis jobId={job.id} />
        </section>
      ) : (
        <section className="match-analysis-placeholder">
          <p>Log in as a Job Seeker and upload a resume to view the Smart Match Analysis for this job!</p>
        </section>
      )}

    </div>
  );
}

export default JobDetailPage;