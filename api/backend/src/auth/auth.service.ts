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

  async forgotPassword(email: string): Promise<any> {
    try {
      const redirectUrl = `${process.env.FRONTEND_URL}/confirm-password`;
      console.log(`Setting up password reset redirect to: ${redirectUrl}`);
      
      // Set the redirect URL for the password reset
      const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      
      if (error) {
        console.error('Error sending reset password email:', error);
        return errorResponse(error.message);
      }
      
      return successResponse({ message: 'Password reset link sent successfully' });
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      return errorResponse('Failed to send password reset link');
    }
  }

  async updateUser({ password }: { password: string }): Promise<any> {
    try {
      console.log('Updating user password');
      
      // Use the current session to update the password
      const { data, error } = await this.supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        console.error('Error updating password:', error);
        return errorResponse(`Failed to update password: ${error.message}`);
      }
      
      return successResponse({ message: 'Password updated successfully', user: data.user });
    } catch (error) {
      console.error('Error in updateUser:', error);
      return errorResponse('Failed to update password');
    }
  }

  async resetPassword(token: string, password: string, refreshToken?: string): Promise<any> {
    try {
      console.log('Attempting to reset password with token');
  
      // Set the session using the access token
      const sessionData: {
        access_token: string;
        refresh_token?: string;
      } = {
        access_token: token,
      };
      
      // Add refresh token if available
      if (refreshToken) {
        sessionData.refresh_token = refreshToken;
      }
      
      const { data, error } = await this.supabase.auth.setSession(sessionData);
  
      if (error) {
        console.error('Error setting session:', error);
        return errorResponse('Failed to set session with provided token');
      }
  
      // Update the user's password
      const { data: updateData, error: updateError } = await this.supabase.auth.updateUser({
        password: password,
      });
  
      if (updateError) {
        console.error('Error updating password:', updateError);
        return errorResponse(`Failed to update password: ${updateError.message}`);
      }
  
      return successResponse({ message: 'Password reset successfully', user: updateData.user });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return errorResponse('Failed to reset password');
    }
  }
}
  