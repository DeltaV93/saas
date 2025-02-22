import { HttpException, HttpStatus } from '@nestjs/common';

export function successResponse(data: any, message = 'Success', statusCode = HttpStatus.OK) {
  return {
    statusCode,
    message,
    data,
  };
}

export function errorResponse(message: string, statusCode = HttpStatus.BAD_REQUEST) {
  throw new HttpException({
    statusCode,
    message,
  }, statusCode);
} 