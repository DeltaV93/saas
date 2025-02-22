import * as AWS from 'aws-sdk';
import { logError } from './logging.helper';

const ses = new AWS.SES({
  region: process.env.AWS_REGION,
});

export async function sendEmail(to: string, subject: string, body: string) {
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
    const result = await ses.sendEmail(params).promise();
    return result;
  } catch (error) {
    logError('Failed to send email', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function generateEmailTemplate(templateName: string, variables: Record<string, string>) {
  // Example template logic
  let template = `Hello, {{name}}! Welcome to our service.`;
  Object.keys(variables).forEach(key => {
    template = template.replace(`{{${key}}}`, variables[key]);
  });
  return template;
} 