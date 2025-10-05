import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Needed for user ID

/**
 * JobBoardPage component displays a list of all available job postings 
 * for Job Seekers to browse. AI suggestions feature has been removed.
 */
function JobBoardPage() {
  // State for the list of all jobs
  const [jobs, setJobs] = useState([]);
  // State for managing loading status
  const [loading, setLoading] = useState(true);
  // State for displaying error messages
  const [error, setError] = useState('');

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Function to fetch all job postings
  const fetchAllJobs = useCallback(async () => {
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
  }, []);

    // NOTE: The fetchRecommendations and recommendedJobs states have been removed
    // as the feature is no longer active on the frontend.
    
  useEffect(() => {
    fetchAllJobs();
  }, [fetchAllJobs]); 

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
      
      {/* AI Recommendation Box has been REMOVED from this section */}
      {/* AI Recommendations List has also been REMOVED */}

      <p className="job-count">Showing <strong>{jobs.length}</strong> active job listings.</p>

      <div className="job-cards-container">
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <p className="company-name"><strong>Company:</strong> {job.company}</p>
            <p className="description-snippet">{getSnippet(job.description)}</p>
            <p className="required-skills">
              <strong>Key Skills:</strong> {getSnippet(job.skills, 50)}
            </p>
            
            {/* Button to navigate to the detailed job page */}
            <button 
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="btn-details"
            >
              View Details & Match Score
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobBoardPage;
