import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { Server } from 'socket.io';
import { logError } from '../utils/logging.helper';

@Injectable()
export class NotificationService {
  private ses: AWS.SES;
  private socketServer: Server;

  constructor() {
    // Initialize AWS SES
    this.ses = new AWS.SES({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Initialize Firebase for push notifications
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }

  setSocketServer(server: Server) {
    this.socketServer = server;
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      const sourceEmail = process.env.SES_SOURCE_EMAIL || 'tools@isphoenixing.com';
      if (!sourceEmail) {
        throw new Error('Source email is required');
      }

      const params = {
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Body: {
            Text: { Data: body },
          },
          Subject: { Data: subject },
        },
        Source: sourceEmail,
      };

      const result = await this.ses.sendEmail(params).promise();
      return result;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendPushNotification(deviceToken: string, title: string, body: string) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        token: deviceToken,
      };

      const result = await admin.messaging().send(message);
      return result;
    } catch (error) {
      throw new Error(`Failed to send push notification: ${error.message}`);
    }
  }

  sendRealTimeNotification(event: string, data: any) {
    if (!this.socketServer) {
      return;
    }

    try {
      this.socketServer.emit(event, data);
    } catch (error) {
      logError('Failed to send real-time notification', error);
    }
  }
}
