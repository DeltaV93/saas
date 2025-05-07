export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FormData {
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  profilePicture?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  status?: number;
} 