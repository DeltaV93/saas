import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import speakeasy from 'speakeasy';
import { ForbiddenException } from '@nestjs/common';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateJwtToken(payload: object, expiresIn: string = '1h'): string {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

export function verifyJwtToken(token: string): JwtPayload | string {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function generateMagicLink(email: string): string {
  const token = uuidv4();
  const magicLink = `${process.env.FRONTEND_URL}/magic-login?token=${token}&email=${encodeURIComponent(email)}`;
  // Store the token in the database or cache with an expiration time
  // Example: await redis.set(token, email, 'EX', 3600);
  return magicLink;
}

export async function handleOAuthResponse(provider: string, code: string): Promise<any> {
  try {
    const tokenResponse = await axios.post(`https://oauth2.googleapis.com/token`, {
      code,
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
      redirect_uri: process.env[`${provider.toUpperCase()}_REDIRECT_URI`],
      grant_type: 'authorization_code',
    });

    const userInfoResponse = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json`, {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`,
      },
    });

    return userInfoResponse.data;
  } catch (error) {
    throw new Error('Failed to handle OAuth response');
  }
}

export function generate2FACode(): { secret: string; otpauth_url: string } {
  const secret = speakeasy.generateSecret({ length: 20 });
  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

export function verify2FACode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
  });
}

export function validateSessionAndPermissions(token: string, requiredRole: string): JwtPayload {
  const decoded = verifyJwtToken(token);
  if (typeof decoded === 'string' || !decoded.role) {
    throw new Error('Invalid token');
  }

  if (decoded.role !== requiredRole) {
    throw new ForbiddenException('Access denied: insufficient permissions');
  }

  return decoded;
} 