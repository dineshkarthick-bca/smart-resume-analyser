import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Global CSS import (also imported in App.jsx, but common practice to include here too)

/**
 * The entry point of the entire React application.
 * It mounts the App component into the DOM.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);