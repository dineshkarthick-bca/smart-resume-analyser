import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * ApplicantsPage component displays a ranked list of job seekers for a specific job posting.
 */
function ApplicantsPage() {
  // Get the jobId from the URL parameters
  const { jobId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State for the fetched applicants list (with match scores)
  const [applicants, setApplicants] = useState([]);
  // State for filtering the list
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTitle, setJobTitle] = useState('Loading Job...'); // To display the job title
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check user role access when component mounts
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Recruiter') {
      setError('Access Denied. Only Recruiters can view this page.');
      setLoading(false);
      // Optionally redirect non-recruiters
      // navigate('/'); 
    }
  }, [currentUser, navigate]);

  // Function to fetch the applicants and their scores
  const fetchApplicants = useCallback(async () => {
    if (!jobId || currentUser?.role !== 'Recruiter') return;

    setLoading(true);
    setError('');

    try {
      // 1. Fetch the job details first to display the title
      const jobResponse = await axios.get(`http://localhost:5001/api/jobs/${jobId}`);
      setJobTitle(jobResponse.data.title);

      // 2. Fetch the ranked list of applicants from the core matching endpoint
      // NOTE: The backend endpoint will calculate the score for all users who have uploaded a resume.
      const applicantsResponse = await axios.get(`http://localhost:5001/api/applicants/${jobId}`);
      
      // Sort the applicants by matchScore (highest score first)
      const sortedApplicants = applicantsResponse.data.sort((a, b) => b.matchScore - a.matchScore);
      
      setApplicants(sortedApplicants);
    } catch (err) {
      setError('Failed to fetch applicant data or job details.');
      console.error('Error fetching applicants:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId, currentUser]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Filter applicants based on the search term (case-insensitive search by email)
  const filteredApplicants = applicants.filter(applicant =>
    applicant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Render Logic ---

  if (loading) {
    return <div className="page-container"><p>Loading and analyzing resumes for applicants...</p></div>;
  }

  if (error) {
    return <div className="page-container error-message"><h3>Error</h3><p>{error}</p></div>;
  }
  
  return (
    <div className="page-container applicants-page">
      <h2>Applicants for: {jobTitle}</h2>
      
      <div className="applicant-controls">
        <input
          type="text"
          placeholder="Search by applicant email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="applicant-list-header">
        <p>Total Applicants with Resumes: {applicants.length}</p>
        {searchTerm && <p>Showing: {filteredApplicants.length}</p>}
      </div>

      {filteredApplicants.length === 0 ? (
        <p>No applicants found matching your criteria or no resumes have been uploaded yet.</p>
      ) : (
        <ul className="applicants-list">
          {/* Header Row for the list */}
          <li className="applicant-item header-row">
            <span className="rank-col">Rank</span>
            <span className="email-col">Applicant Email</span>
            <span className="score-col">Match Score</span>
            <span className="skills-col">Matched Skills</span>
          </li>

          {filteredApplicants.map((applicant, index) => (
            <li key={applicant.userId} className="applicant-item">
              <span className="rank-col">#{index + 1}</span>
              <span className="email-col">{applicant.email}</span>
              <span className="score-col score-badge">{applicant.matchScore}%</span>
              <span className="skills-col">
                {applicant.matchedSkills.length > 0 ? (
                  applicant.matchedSkills.slice(0, 3).join(', ') + (applicant.matchedSkills.length > 3 ? '...' : '')
                ) : (
                  None
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ApplicantsPage;