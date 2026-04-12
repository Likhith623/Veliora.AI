"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [userDetails, setUserDetails] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('userDetails');
      return savedUser ? JSON.parse(savedUser) : {
        name: '',
        gender: '',
        email : '',
        // city : '',
        auth_provider:''
      };
    }
    return {
      name: '',
      gender: '',
      email : '',
      // city : '',
      auth_provider:''
    };
  });

  // Save to localStorage whenever userDetails changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userDetails', JSON.stringify(userDetails));
    }
  }, [userDetails]);

  return (
    <UserContext.Provider value={{ userDetails, setUserDetails }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}