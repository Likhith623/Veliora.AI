'use client';

import { useEffect } from 'react';
import { logClientError } from '@/lib/logClientError';

// Error component receives the error object and a reset function (used by Next.js App Router)
export default function Error({ error, reset }) {
  useEffect(() => {
    // Sending the error to logClientError to log it
    logClientError(error, {
      source: 'AppRouterErrorBoundary',
      additional: { message: error.message, stack: error.stack },
    });
  }, [error]);
  // Handler to reload the current page when the user clicks the button
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fafafa] to-[#f0f0f0] text-[#333] px-6">
      <div className="max-w-xl bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-200">
        <h1 className="text-2xl mb-4 text-[#d32f2f]">
          Oops! Something went wrong.
        </h1>

        <p className="mb-6 text-gray-600">
          We sure will be back. In the meantime, try refreshing the page or please come back in a while.
        </p>

        <button
          onClick={handleReload}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-red-200 via-orange-200 to-red-200 text-white font-medium shadow hover:shadow-md transition-all"
        >
          Refresh Page
        </button>

        {process.env.NODE_ENV === 'development' && error?.stack && (
          <pre className="mt-6 text-left text-sm text-red-500 overflow-auto max-h-96 bg-gray-100 p-4 rounded-md border border-gray-300">
            <code>{error.stack}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
