'use client';
import { useEffect } from 'react';
import { logClientError } from '@/lib/logClientError';

const GlobalErrorListener = () => {
  useEffect(() => {
    console.log('Setting up window.onerror');

    window.onerror = function (message, source, lineno, colno, error) {
      console.log('window.onerror triggered');
      logClientError(
        { message, stack: error?.stack || null },
        { source, lineNumber: lineno, columnNumber: colno }
      );
      return true; // Prevent default browser handler
    };

    window.onunhandledrejection = function (event) {
      console.log('Unhandled Promise rejection');
      logClientError(
        { message: event.reason?.message || 'Unhandled rejection', stack: event.reason?.stack },
        { source: 'UnhandledRejection' }
      );
      return true;
    };
  }, []);

  return null;
};

export default GlobalErrorListener;
