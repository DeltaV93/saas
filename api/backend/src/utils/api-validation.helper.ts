import { logError } from './logging.helper';

export async function validateApiResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json();
    logError('API validation failed', errorData);
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }
  return response.json();
} 