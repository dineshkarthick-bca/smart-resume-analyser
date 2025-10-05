import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import JobForm from '../components/JobForm';
import MyJobsList from '../components/MyJobsList';
import ResumeUploader from '../components/ResumeUploader';
import { Link } from 'react-router-dom';

/**
 * DashboardPage serves as the main authenticated landing page.
 * It conditionally renders components based on the user's role.
 */
function DashboardPage() {
  // Get user information from the AuthContext
  const { currentUser } = useAuth();
  
  // State used to force the MyJobsList component to refresh when a new job is posted
  const [jobPostRefresh, setJobPostRefresh] = useState(false);

  // Function passed to JobForm to trigger a refresh in MyJobsList
  const triggerJobRefresh = () => {
    // Toggle the state to force the MyJobsList useEffect to run
    setJobPostRefresh(prev => !prev);
  };

  // Display a generic loading message if user data hasn't fully loaded (though AuthContext handles most of this)
  if (!currentUser) {
    return <div className="page-container">Loading dashboard...</div>;
  }
  
  return (
    <div className="page-container dashboard-page">
      <h1>Welcome to Your Dashboard!</h1>
      
      <p className="user-info">
        You are logged in as a {currentUser.role}.
      </p>

      {/* --- Conditional Rendering Based on Role --- */}

      {currentUser.role === 'Recruiter' && (
        <div className="recruiter-section">
          <h2>Recruiter Tools 🛠️</h2>
          
          {/* 1. Job Posting Form */}
          <JobForm onJobPosted={triggerJobRefresh} />
          <hr className="divider" />
          
          {/* 2. List of Posted Jobs */}
          <MyJobsList refreshTrigger={jobPostRefresh} />
        </div>
      )}

      {currentUser.role === 'Job Seeker' && (
        <div className="seeker-section">
          <h2>Job Seeker Center 🚀</h2>
          
          {/* 1. Resume Uploader */}
          <ResumeUploader />
          
          <hr className="divider" />

          {/* 2. Link to Browse Jobs */}
          <div className="job-board-link-box">
            <h3>Ready to find your match?</h3>
            <p>Head over to the Job Board to see all active job listings and get your resume analyzed against them.</p>
            <Link to="/jobs" className="btn btn-primary">Find Jobs Now</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;