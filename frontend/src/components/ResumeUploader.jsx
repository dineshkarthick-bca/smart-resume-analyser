import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * ResumeUploader component allows a job seeker to upload their resume (PDF).
 */
function ResumeUploader() {
  // State to hold the selected file
  const [file, setFile] = useState(null);
  // State for managing loading status during upload
  const [uploading, setUploading] = useState(false);
  // State for displaying messages (success or error)
  const [message, setMessage] = useState('');

  // Get the current user ID
  const { currentUser } = useAuth();

  // Function to handle file selection
  const handleFileChange = (e) => {
  const selectedFile = e.target.files[0];
  const fileType = selectedFile?.type;

  // Define allowed MIME types
  const allowedTypes = [
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'text/plain' // TXT
  ];

  if (selectedFile && allowedTypes.includes(fileType)) {
    // File is valid
    setFile(selectedFile);
    setMessage(''); 
  } else {
    // File is invalid
    setFile(null);
    setMessage('Please select a valid PDF, DOCX, or TXT file.');
  }
};

  // Function to handle form submission (upload)
  const handleUpload = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!file) {
      setMessage('Please select a resume file before uploading.');
      return;
    }

    if (!currentUser) {
      setMessage('You must be logged in to upload a resume.');
      return;
    }

    setUploading(true);

    // Create a FormData object to send the file and user ID
    const formData = new FormData();
    formData.append('resume', file); // 'resume' must match the key used by multer on the backend
    formData.append('userId', currentUser.uid); // Pass the user ID to link the resume text

    try {
      // Make a POST request to the backend upload endpoint
      await axios.post('http://localhost:5001/api/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Essential for file uploads
        },
      });

      setMessage('Resume uploaded and analyzed successfully! You can now view job matches.');
      // Optionally clear the file input after success
      setFile(null);
    } catch (error) {
      // Handle potential errors from the server (e.g., PDF parse failure, file size limit)
      const errorMsg = error.response?.data?.message || 'An unexpected error occurred during upload.';
      setMessage(`Upload Failed: ${errorMsg}`);
      console.error('Error uploading resume:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="resume-uploader-container">
      <h3>Upload Your Resume (PDF)</h3>
      <form onSubmit={handleUpload}>
        <div className="form-group">
          <label htmlFor="resume-file">Select PDF File</label>
          <input
  id="resume-file"
  type="file"
  // CRITICAL: Ensure all MIME types are listed
  accept=".pdf, .docx, .txt, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain" 
  onChange={handleFileChange}
  required
/>
        </div>
        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading & Analyzing...' : 'Upload Resume'}
        </button>
      </form>
      {message && <p className={`upload-message ${message.includes('success') ? 'success' : 'error'}`}>{message}</p>}
    </div>
  );
}

export default ResumeUploader;