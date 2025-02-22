import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { Server } from 'socket.io';

@Injectable()
export class NotificationService {
  private ses = new AWS.SES({
    region: process.env.AWS_REGION,
  });

  private io: Server;

  constructor() {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  setSocketServer(io: Server) {
    this.io = io;
  }

  async sendEmail(to: string, subject: string, body: string) {
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
      Source: process.env.SES_SOURCE_EMAIL,
    };

    try {
      const result = await this.ses.sendEmail(params).promise();
      return result;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendPushNotification(token: string, title: string, body: string) {
    const message = {
      notification: {
        title,
        body,
      },
      token,
    };

    try {
      const response = await admin.messaging().send(message);
      return response;
    } catch (error) {
      throw new Error(`Failed to send push notification: ${error.message}`);
    }
  }

  sendRealTimeNotification(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}
