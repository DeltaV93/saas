// Update this file at api/backend/src/utils/authentication.helper.ts

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
// Import bcrypt with a fallback
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  // Fallback to a non-native implementation if bcrypt fails
  console.warn('Native bcrypt failed to load, using fallback implementation');
  bcrypt = {
    hashSync: (data: string, salt: number) => {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      hash.update(data + salt);
      return hash.digest('hex');
    },
    compareSync: (data: string, hash: string) => {
      const crypto = require('crypto');
      const hashObj = crypto.createHash('sha256');
      // This is a simplified version and not secure for production
      return hashObj.update(data).digest('hex') === hash;
    },
    genSaltSync: () => {
      return 10; // Default salt rounds
    }
  };
}

// Secret key for JWT
const secretKey = process.env.JWT_SECRET || 'your-secret-key';

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

// Hash a password
export const hashPassword = (password: string): string => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

// Compare a password with a hash
export const comparePassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};

// Validate session and permissions
export const validateSessionAndPermissions = (token: string, requiredRole: string): void => {
  try {
    const decoded = verifyToken(token);
    
    // Check if the user has the required role
    if (decoded.role !== requiredRole && decoded.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
  } catch (error) {
    throw new Error('Authentication failed');
  }
};