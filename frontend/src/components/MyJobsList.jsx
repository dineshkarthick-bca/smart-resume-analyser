import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * MyJobsList component displays all jobs posted by the logged-in recruiter.
 * It provides options to view applicants and delete jobs.
 * @param {object} props - Component props.
 * @param {boolean} props.refreshTrigger - A boolean that can be toggled by the parent 
 * (e.g., JobForm) to force a data refresh.
 */
function MyJobsList({ refreshTrigger }) {
  // State for the list of jobs fetched from the backend
  const [jobs, setJobs] = useState([]);
  // State for managing loading status
  const [loading, setLoading] = useState(true);
  // State for displaying error messages
  const [error, setError] = useState('');

  // Get the current user (which is the Recruiter in this context)
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Function to fetch the jobs for the current recruiter
  const fetchMyJobs = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'Recruiter') {
      setError("You must be logged in as a Recruiter to view your job postings.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // API endpoint to fetch jobs by the recruiter's ID
      const response = await axios.get(
        `http://localhost:5001/api/jobs/my-jobs/${currentUser.uid}`
      );
      setJobs(response.data);
    } catch (err) {
      setError("Failed to fetch your jobs.");
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // useEffect to call the fetch function when the component mounts or the refresh trigger changes
  useEffect(() => {
    fetchMyJobs();
  }, [fetchMyJobs, refreshTrigger]);

  // Function to handle job deletion
  const handleDelete = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) {
      return;
    }

    try {
      // API endpoint to delete a specific job by its ID
      await axios.delete(`http://localhost:5001/api/jobs/${jobId}`);
      alert('Job deleted successfully.');

      // Re-fetch the job list to update the UI immediately
      fetchMyJobs();
    } catch (err) {
      setError("Failed to delete job.");
      console.error("Error deleting job:", err);
    }
  };

  // --- Render Logic ---
  if (loading) {
    return <p>Loading your job postings...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="my-jobs-list-container">
      <h3>Your Active Postings ({jobs.length})</h3>

      {jobs.length === 0 ? (
        <p>You have not posted any jobs yet. Use the form above to post your first one!</p>
      ) : (
        <ul className="jobs-list">
          {jobs.map(job => (
            <li key={job.id} className="job-item">
              <div className="job-info">
                <h4>{job.title} at {job.company}</h4>
                <p className="skills-summary">
                  Skills: {job.skills.length > 50 ? `${job.skills.substring(0, 50)}...` : job.skills}
                </p>
              </div>
              <div className="job-actions">
                {/* Button to navigate to the ApplicantsPage for this job */}
                <button
                  className="view-applicants-btn"
                  onClick={() => navigate(`/applicants/${job.id}`)}
                >
                  View Applicants
                </button>
                
                {/* Button to delete the job posting */}
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(job.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyJobsList;