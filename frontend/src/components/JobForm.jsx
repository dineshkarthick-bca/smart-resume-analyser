import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * JobForm component for recruiters to post new jobs.
 * It takes a prop `onJobPosted` which is a function to be called
 * after a job is successfully posted, allowing the parent component
 * (like a job list) to refresh its data.
 */
function JobForm({ onJobPosted }) {
  // State for each form input
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState(''); // State for the skills input field

  // State for displaying success or error messages to the user
  const [message, setMessage] = useState('');

  // Get the current user from the authentication context
  const { currentUser } = useAuth();

  // Function to handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setMessage(''); // Clear any previous messages

    // Ensure a user is logged in before allowing a post
    if (!currentUser) {
      setMessage('You must be logged in to post a job.');
      return;
    }

    // Prepare the job data object to be sent to the backend
    const jobData = {
      title,
      company,
      description,
      skills, // The comma-separated string of skills
      recruiterId: currentUser.uid, // Attach the recruiter's ID
      postedOn: new Date().toISOString() // Set the current date as the post date
    };

    try {
      // Make a POST request to the backend API endpoint for creating jobs
      await axios.post('http://localhost:5001/api/jobs', jobData);
      
      setMessage('Job posted successfully!');
      
      // Clear the form fields after a successful post
      setTitle('');
      setCompany('');
      setDescription('');
      setSkills('');

      // If the onJobPosted prop is provided, call it to trigger a data refresh
      if (onJobPosted) {
        onJobPosted();
      }

    } catch (error) {
      setMessage('Failed to post job. Please try again.');
      console.error('Error posting job:', error);
    }
  };

  return (
    <div className="job-form-container">
      <h3>Post a New Job</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Job Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Senior React Developer"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="company">Company Name</label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g., Tech Solutions Inc."
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="skills">Required Skills</label>
          <input
            id="skills"
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g., React, Node.js, Firebase"
            required
          />
          <small>Please provide a comma-separated list of skills.</small>
        </div>
        <div className="form-group">
          <label htmlFor="description">Job Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the role and responsibilities..."
            required
          />
        </div>
        <button type="submit">Post Job</button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default JobForm;