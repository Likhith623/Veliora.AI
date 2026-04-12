
//  Logs a client-side error to a remote backend API.
const logClientError = async (error, context = {}) => {
  console.log("logClientError invoked");
    try {
      // Construct log data object
      const logData = {
        message: error.message,
        source: context.source,
        line_number: context.lineNumber,
        column_number: context.columnNumber,
        stack_trace: error.stack,
        browser: typeof window !== 'undefined' ? navigator.userAgent : 'Server', // Check for window
        url: typeof window !== 'undefined' ? window.location.href : 'Server',     // Check for window
        additional_context: context.additional || {},
        timestamp: new Date().toISOString(),
      };

      console.log(logData)
      
      // Send the log data to the backend API endpoint
      const response = await fetch('http://localhost:8000/api/logs/frontend-error', {
        // Adjust the API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });
  
      console.log(response);
      if (!response.ok) {
        // Log failure if response is not OK
        console.error(
          'Failed to log error to backend:',
          response.status,
          await response.text()
        );
      } else {
        // Confirm success
        console.log('Frontend error logged to backend successfully.');
      }
    } catch (e) {
      // Catch any unexpected error in the logging function itself
      console.error('Error sending log to backend:', e);
    }
  };
  
  export { logClientError };