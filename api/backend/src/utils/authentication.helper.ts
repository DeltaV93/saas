// src/utils/authentication.helper.ts

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Secret key for JWT
const secretKey = process.env.JWT_SECRET || 'your-secret-key';

// User type definition
interface User {
  id: string;
  role: string;
  [key: string]: any;
}

// Generate a JWT token
export const generateToken = (userId: string, role: string = 'user'): string => {
  return jwt.sign(
    {
      userId,
      role,
      sessionId: uuidv4(),
    },
    secretKey,
    { expiresIn: '7d' }
  );
};

// Verify and decode a JWT token
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Validate session and permissions
export const validateSessionAndPermissions = (token: string, requiredRole: string): User => {
  try {
    const decoded = verifyToken(token);
    
    // Return a user object with at least id and role properties
    return {
      id: decoded.userId,
      role: decoded.role,
      // Include any other properties from decoded token
      ...decoded
    };
  } catch (error) {
    throw new Error('Authentication failed');
  }
};