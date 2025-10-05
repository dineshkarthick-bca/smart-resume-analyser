import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * The Layout component provides a consistent header and navigation
 * for all authenticated pages in the application.
 */
function Layout() {
  // Get the current user and logout function from our AuthContext
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Handles the user logout process
  const handleLogout = async () => {
    try {
      await logout(); // Call the logout function from AuthContext
      navigate('/login'); // Redirect the user to the login page
    } catch (error) {
      console.error('Failed to log out:', error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <nav className="app-nav">
          <div className="nav-links">
            {/* Link to the main dashboard, visible to all logged-in users */}
            <Link to="/">Dashboard</Link>
            
            {/* Conditionally render the "Find Jobs" link ONLY for Job Seekers */}
            {currentUser && currentUser.role === 'Job Seeker' && (
              <Link to="/jobs">Find Jobs</Link>
            )}
          </div>

          <div className="nav-user-actions">
            {/* Display the user's email as a welcome message */}
            {currentUser && <span>Welcome, {currentUser.email}</span>}
            
            {/* Logout button that triggers the handleLogout function */}
            <button onClick={handleLogout} className="logout-button">
              Log Out
            </button>
          </div>
        </nav>
      </header>

      <main className="app-content">
        {/* The Outlet component renders the content of the matched child route. */}
        {/* This is where pages like DashboardPage or ApplicantsPage will be displayed. */}
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;