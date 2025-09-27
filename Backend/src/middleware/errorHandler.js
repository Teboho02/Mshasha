// Helper function to handle Firestore errors
const handleFirestoreError = (error, res) => {
  console.error('Firestore error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Database operation failed', 
    error: error.message 
  });
};

// Global error handler
const globalErrorHandler = (error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

export { handleFirestoreError, globalErrorHandler, notFoundHandler };