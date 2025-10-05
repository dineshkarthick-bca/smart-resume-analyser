import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Import auth and db from our firebase initialization file

// 1. Create the Context object
const AuthContext = createContext();

// 2. Custom hook to use the AuthContext easily
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider component that wraps the entire application (or main part)
 * to provide authentication state and functions globally.
 */
export function AuthProvider({ children }) {
  // State to hold the current user object (including their custom role)
  const [currentUser, setCurrentUser] = useState(null);
  // State to track if the initial authentication status check is complete
  const [loading, setLoading] = useState(true);

  // --- 3. Authentication Functions (for components to call) ---

  /**
   * Registers a new user with Firebase Auth and saves their role to Firestore.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @param {string} role - User's selected role ('Recruiter' or 'Job Seeker').
   */
  const signup = async (email, password, role) => {
    // 1. Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Save the custom role and email to the 'users' collection in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      role: role, // 'Recruiter' or 'Job Seeker'
      createdAt: new Date(),
    });

    return user;
  };

  // Logs in an existing user
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logs out the current user
  const logout = () => {
    return signOut(auth);
  };

  // --- 4. User State Listener (runs once on component mount) ---

  useEffect(() => {
    // This function runs whenever the user's sign-in state changes (login, logout, token refresh)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // If user is logged in, fetch their custom role from Firestore
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Set the current user object with the attached role
            setCurrentUser({ ...user, role: docSnap.data().role });
          } else {
            // Handle case where user exists in Auth but not in Firestore (shouldn't happen with our signup logic)
            setCurrentUser(user);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setCurrentUser(user); // Still set the basic user even if role fetch fails
        }
      } else {
        // User is logged out
        setCurrentUser(null);
      }
      
      // Set loading to false once the initial check is complete
      setLoading(false);
    });

    // Cleanup function to unsubscribe the listener when the component unmounts
    return unsubscribe;
  }, []); // Empty dependency array means this effect runs only once

  // 5. Value object to be exposed by the context provider
  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
  };

  // 6. Render the provider, passing the value to all child components
  return (
    <AuthContext.Provider value={value}>
      {/* Only render children when we are finished loading/checking state */}
      {!loading && children}
    </AuthContext.Provider>
  );
}