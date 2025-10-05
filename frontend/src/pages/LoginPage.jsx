import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * LoginPage component handles user authentication (login).
 */
function LoginPage() {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State for displaying error messages
  const [error, setError] = useState('');
  // State for managing loading status during API calls
  const [loading, setLoading] = useState(false);

  // Get the login function from AuthContext
  const { login } = useAuth();
  // Hook to programmatically navigate users
  const navigate = useNavigate();

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    if (email === '' || password === '') {
      setError('Please fill in both email and password fields.');
      return;
    }

    try {
      setLoading(true);
      // Call the login function from AuthContext
      await login(email, password);
      
      // On successful login, redirect to the Dashboard (root protected route)
      navigate('/');

    } catch (err) {
      // Display user-friendly error messages based on Firebase error codes
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password. Please check your credentials.');
          break;
        case 'auth/invalid-email':
          setError('The email address is badly formatted.');
          break;
        default:
          setError('Failed to log in. Please try again.');
          console.error('Login error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-form-box">
        <h2>Login to Smart Resume Analyzer</h2>
        <form onSubmit={handleSubmit}>
          
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        
        <p className="auth-switch">
          Need an account? <Link to="/signup">Sign Up Here</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;