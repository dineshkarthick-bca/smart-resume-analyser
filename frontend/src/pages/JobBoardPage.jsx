import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * JobBoardPage component displays a list of all available job postings 
 * for Job Seekers to browse.
 */
function JobBoardPage() {
  // State for the list of all jobs
  const [jobs, setJobs] = useState([]);
  // State for managing loading status
  const [loading, setLoading] = useState(true);
  // State for displaying error messages
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    // Function to fetch all job postings
    const fetchAllJobs = async () => {
      setLoading(true);
      setError('');
      try {
        // API endpoint to fetch ALL job postings
        const response = await axios.get('http://localhost:5001/api/jobs');
        setJobs(response.data);
      } catch (err) {
        setError('Failed to fetch job board listings.');
        console.error('Error fetching all jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllJobs();
  }, []); // Empty dependency array means this runs only once on mount

  // Function to shorten the job description for the card view
  const getSnippet = (text, maxLength = 100) => {
    if (!text) return 'No description provided.';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // --- Render Logic ---

  if (loading) {
    return <div className="page-container"><p>Loading job board...</p></div>;
  }

  if (error) {
    return <div className="page-container error-message"><h3>Error</h3><p>{error}</p></div>;
  }
  
  return (
    <div className="page-container job-board-page">
      <h2>Find Your Next Opportunity</h2>
      
      {jobs.length === 0 ? (
        <p>No job postings are currently available. Check back soon!</p>
      ) : (
        <p className="job-count">Showing {jobs.length} active job listings.</p>
      )}

      <div className="job-cards-container">
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <p className="company-name">Company: {job.company}</p>
            <p className="description-snippet">{getSnippet(job.description)}</p>
            <p className="required-skills">
              Key Skills:{getSnippet(job.skills, 50)}
            </p>
            
            {/* Button to navigate to the detailed job page */}
            <button 
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="btn-details"
            >
              View Details & Get Match Score
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobBoardPage;