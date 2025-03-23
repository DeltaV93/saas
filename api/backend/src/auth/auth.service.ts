import { Injectable } from '@nestjs/common';
import { createClient, User } from '@supabase/supabase-js';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { successResponse, errorResponse } from '../utils/api-response.helper';

@Injectable()
export class AuthService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(private jwtService: JwtService) {}

  async signup(email: string, password: string): Promise<User> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const payload = { email: data.user.email, sub: data.user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async googleSignup(token: string): Promise<any> {
    try {
      const userInfo = await this.verifyGoogleToken(token);
      const { data, error } = await this.supabase.auth.signUp({
        email: userInfo.email,
        password: userInfo.id, // Use a secure method to handle passwords
      });
      if (error) {
        return errorResponse(error.message);
      }
      return successResponse(data.user);
    } catch (error) {
      return errorResponse(error.message);
    }
  }

  private async verifyGoogleToken(token: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid Google token');
    return { email: payload.email, id: payload.sub };
  }

  async getUserInfo(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, role, subscriptionType, subscriptionStatus')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateUserProfile(userId: string, updateData: { name: string; email: string }) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }

    return data;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    // Use the correct method for signing in with email and password
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return null;
    }
    return data.user;
  }
}
