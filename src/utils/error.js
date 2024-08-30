const errorHandler = (err, req, res, next) => {
    // Log the error (optional, but useful for debugging)
    console.error(err.stack);
  
    // Determine the status code
    const statusCode = err.statusCode || 500;
  
    // Send a JSON response with the error details
    res.status(statusCode).json({
      success: false,
      error: {
        status: statusCode,
        message: err.message || 'An unexpected error occurred'
      }
    });
  };
  
  export default errorHandler;
  