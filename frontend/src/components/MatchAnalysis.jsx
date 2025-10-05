import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * MatchAnalysis component fetches and displays a job seeker's match score
 * for a specific job based on their uploaded resume.
 * It requires the `jobId` as a prop.
 */
function MatchAnalysis({ jobId }) {
  // State to hold the analysis data (score, matched skills, missing skills)
  const [analysis, setAnalysis] = useState(null);
  // State to manage the loading status while fetching data
  const [loading, setLoading] = useState(true);
  // State to hold any potential error messages
  const [error, setError] = useState('');

  // Get the current user from our authentication context
  const { currentUser } = useAuth();

  // useEffect hook to fetch the analysis when the component mounts or props change
  useEffect(() => {
    // Define an async function to perform the API call
    const fetchAnalysis = async () => {
      // Ensure we have the necessary IDs before making a request
      if (!jobId || !currentUser?.uid) {
        setError('Cannot perform analysis without a job or user.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(''); // Clear previous errors
        
        // Make the GET request to the match analysis endpoint
        const response = await axios.get(`http://localhost:5001/api/match/${jobId}/${currentUser.uid}`);
        
        // Update state with the data from the API response
        setAnalysis(response.data);
      } catch (err) {
        // Handle different types of errors
        if (err.response && err.response.status === 404) {
          setError('Analysis could not be performed. Please ensure you have uploaded a resume.');
        } else {
          setError('An error occurred while analyzing your match.');
        }
        console.error('Error fetching match analysis:', err);
      } finally {
        // Set loading to false once the request is complete (either success or fail)
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [jobId, currentUser]); // Dependency array: re-run the effect if jobId or currentUser changes

  // Render a loading message while data is being fetched
  if (loading) {
    return <div className="analysis-container"><p>Analyzing your resume against this job...</p></div>;
  }

  // Render an error message if something went wrong
  if (error) {
    return <div className="analysis-container error"><p>{error}</p></div>;
  }
  
  // Render nothing if the analysis couldn't be completed (e.g., no data)
  if (!analysis) {
    return null;
  }

  // Render the full analysis results
  return (
    <div className="analysis-container">
      <h3>Your Match Analysis</h3>
      <div className="match-score">
        <p>Match Score</p>
        <span>{analysis.matchScore}%</span>
      </div>
      <div className="skills-breakdown">
        <div className="skills-matched">
          <h4>✅ Skills You Have</h4>
          {analysis.matchedSkills.length > 0 ? (
            <ul>
              {analysis.matchedSkills.map(skill => <li key={skill}>{skill}</li>)}
            </ul>
          ) : (
            <p>No matching skills found.</p>
          )}
        </div>
        <div className="skills-missing">
          <h4>❌ Skills You're Missing</h4>
          {analysis.missingSkills.length > 0 ? (
            <ul>
              {analysis.missingSkills.map(skill => <li key={skill}>{skill}</li>)}
            </ul>
          ) : (
            <p>Great news! You have all the required skills.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchAnalysis;