import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component restricts access to routes to only logged-in users.
 * If a user is not authenticated, they are redirected to the login page.
 */
function ProtectedRoute() {
  // Get the authentication state from the global context
  const { currentUser, loading } = useAuth();

  // 1. While authentication status is being checked (Firebase initialization),
  // display a loading message to prevent flickering or incorrect redirects.
  if (loading) {
    // A simple div or spinner can be used here.
    return <div className="loading-screen">Checking authentication status...</div>;
  }

  // 2. If the user is NOT logged in (currentUser is null or undefined),
  // redirect them to the /login page. The 'replace' prop ensures
  // the login page replaces the current entry in the history stack.
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. If the user IS logged in, render the child route content.
  // <Outlet /> is used here because this component will be used
  // as a parent route in App.jsx (see nested routing in the final phase).
  return <Outlet />;
}

export default ProtectedRoute;