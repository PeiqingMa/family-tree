export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface UserCreate {
  username: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  username: string;
  role: 'user' | 'admin';
}

export interface UserResponse {
  id: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
}
