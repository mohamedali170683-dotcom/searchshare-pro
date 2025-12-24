/**
 * Error handling middleware
 */

export function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Determine status code
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    statusCode = 401;
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    err.message = 'A record with this value already exists';
  } else if (err.code === 'P2025') {
    // Prisma record not found
    statusCode = 404;
    err.message = 'Record not found';
  }

  res.status(statusCode).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
