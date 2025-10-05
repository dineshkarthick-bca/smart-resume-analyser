import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * SignUpPage component handles user registration and role selection.
 */
function SignUpPage() {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Crucial state for the user's role
  const [role, setRole] = useState(''); 
  // State for displaying error messages
  const [error, setError] = useState('');
  // State for managing loading status during API calls
  const [loading, setLoading] = useState(false);

  // Get the signup function from AuthContext
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Client-side validation for all fields, including role
    if (email === '' || password === '' || role === '') {
      setError('Please fill in all fields and select a role.');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      // Call the signup function, passing email, password, AND the selected role
      await signup(email, password, role);
      
      // On successful registration, redirect to the Dashboard
      navigate('/');

    } catch (err) {
      // Display user-friendly error messages based on Firebase error codes
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Try logging in.');
          break;
        case 'auth/invalid-email':
          setError('The email address is badly formatted.');
          break;
        default:
          setError('Failed to create an account. Please try again.');
          console.error('Sign Up error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-form-box">
        <h2>Create Your Account</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label htmlFor="role">I am a...</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="" disabled>Select a role</option>
              <option value="Job Seeker">Job Seeker</option>
              <option value="Recruiter">Recruiter</option>
            </select>
            <small>Your dashboard and features will change based on your role.</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (min 6 characters)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log In Here</Link>
        </p>
      </div>
    </div>
  );
}

export default SignUpPage;