import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
// Import Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import JobBoardPage from './pages/JobBoardPage';
import JobDetailPage from './pages/JobDetailPage';
import ApplicantsPage from './pages/ApplicantsPage';

// Import CSS (assuming it includes general styles for the app)
import './index.css'; 

/**
 * The main component of the React application.
 * It sets up context providers and defines the application's routing structure.
 */
function App() {
  return (
    // 1. Set up client-side routing
    <BrowserRouter>
      {/* 2. Wrap the application with the AuthProvider to give all components access to user state */}
      <AuthProvider>
        <Routes>
          
          {/* ========================================== */}
          {/* 3. PUBLIC ROUTES (Login and Sign Up) */}
          {/* These routes are accessible to unauthenticated users */}
          {/* ========================================== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          
          {/* ========================================== */}
          {/* 4. PROTECTED ROUTES (Requires login) */}
          {/* The ProtectedRoute ensures the user is logged in before rendering children */}
          {/* The Layout component wraps the children to provide a consistent header/footer */}
          {/* ========================================== */}
          <Route element={<ProtectedRoute />}>
            {/* Nested routes use Layout as the wrapper/template */}
            <Route element={<Layout />}>
              
              {/* Dashboard - Root protected path */}
              <Route path="/" element={<DashboardPage />} /> 

              {/* Job Seeker Routes */}
              <Route path="/jobs" element={<JobBoardPage />} /> 
              <Route path="/jobs/:jobId" element={<JobDetailPage />} /> 

              {/* Recruiter Route */}
              <Route path="/applicants/:jobId" element={<ApplicantsPage />} /> 
            </Route>
          </Route>
          
          {/* Fallback route for unmatched paths */}
          <Route path="*" element={<div className="page-container"><h1>404 | Page Not Found</h1></div>} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
