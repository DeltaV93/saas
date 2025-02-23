const IS_MOCK_DATA = process.env.NEXT_PUBLIC_IS_MOCK_DATA === 'true';

const mockData: { [key: string]: any } = {
  '/auth/signup': { success: true, user: { name: 'New User', role: 'user' } },
  '/auth/login': { success: true, token: 'mock-jwt-token' },
  '/auth/magic-link': { success: true },
  '/auth/reset-password': { success: true },
  '/auth/me': {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    subscriptionType: 'premium',
    subscriptionStatus: 'active',
  },
  '/user/profile': { name: 'John Doe', email: 'john@example.com' },
  '/user/update': { success: true },
  '/user/change-password': { success: true },
  '/user/delete-account': { success: true },
  '/auth/role': { role: 'user' },
  '/auth/update-role': { success: true, newRole: 'premium' },
  '/auth/send-verification-email': { success: true },
  '/auth/verify-email': { success: true },
  '/stripe/create-checkout-session': { url: 'https://mock-checkout-session-url' },
  '/stripe/webhook': { success: true },
  '/auth/subscription-status': { plan: 'premium' },
  '/stripe/retry-payment': { success: true },
  '/stripe/subscription-details': { plan: 'premium', status: 'active' },
  '/stripe/cancel-subscription': { success: true },
  '/stripe/update-plan': { success: true },
  '/api/admin/users': [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ],
  '/auth/login-google': { success: true, token: 'mock-google-jwt-token' },
  '/auth/send-magic-link': { success: true },
  '/api/user': {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    subscriptionType: 'premium',
    subscriptionStatus: 'active',
  },
  '/auth/logout': { success: true },
  '/auth/forgot-password': { success: true },
};

export const apiClient = async (endpoint: string, options?: RequestInit) => {
  if (IS_MOCK_DATA) {
    console.log(`Mock data for ${endpoint}`);
    return new Promise((resolve) => {
      setTimeout(() => resolve({
        json: () => Promise.resolve(mockData[endpoint]),
      }), 500);
    });
  }

  const response = await fetch(`http://localhost:8000${endpoint}`, options);
  return response;
}; 