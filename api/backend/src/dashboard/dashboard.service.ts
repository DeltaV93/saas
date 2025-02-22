import { Injectable } from '@nestjs/common';
import * as Mixpanel from 'mixpanel';
import { logError } from '../utils/logging.helper';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DashboardService {
  private mixpanel: Mixpanel.Mixpanel;

  constructor() {
    try {
      if (!process.env.MIXPANEL_TOKEN) {
        throw new Error('MIXPANEL_TOKEN is not defined in environment variables');
      }
      
      this.mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);
    } catch (error) {
      logError('Failed to initialize Mixpanel', error);
    }
  }

  async trackEvent(event: string, properties: Record<string, any>) {
    try {
      if (!this.mixpanel) {
        throw new Error('Mixpanel is not initialized');
      }
      await this.mixpanel.track(event, properties);
    } catch (error) {
      logError('Failed to track event', { event, properties, error });
    }
  }

  async trackUserEngagement(userId: string, event: string, properties: Record<string, any>) {
    try {
      if (!this.mixpanel) {
        throw new Error('Mixpanel is not initialized');
      }
      await this.mixpanel.people.set(userId, properties);
      await this.mixpanel.track(event, { distinct_id: userId, ...properties });
    } catch (error) {
      logError('Failed to track user engagement', { userId, event, properties, error });
    }
  }
}
