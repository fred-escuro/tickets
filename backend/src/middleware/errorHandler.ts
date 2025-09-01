import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: (req as any).user?.id
  });

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const message = 'Database operation failed';
    error = {
      name: 'DatabaseError',
      message,
      statusCode: 400
    } as AppError;
  }

  // Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    const message = 'Invalid data provided';
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400
    } as AppError;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      name: 'AuthenticationError',
      message,
      statusCode: 401
    } as AppError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      name: 'AuthenticationError',
      message,
      statusCode: 401
    } as AppError;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    const message = 'File upload error';
    error = {
      name: 'FileUploadError',
      message,
      statusCode: 400
    } as AppError;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = 'Validation failed';
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400
    } as AppError;
  }

  // Cast errors (MongoDB/ObjectId)
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400
    } as AppError;
  }

  // Duplicate key errors
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value';
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400
    } as AppError;
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const response: ApiResponse = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};
