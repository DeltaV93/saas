import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({
  colorize: true,
});

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
}, process.env.NODE_ENV !== 'production' ? stream : undefined);

export function logInfo(message: string, data?: any) {
  logger.info({ message, data });
}

export function logError(message: string, error?: any) {
  logger.error({ message, error });
}

export function logDebug(message: string, data?: any) {
  logger.debug({ message, data });
} 