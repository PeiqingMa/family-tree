import axios from 'axios';
import type {
  Person,
  PersonDetail,
  CreatePersonData,
  CreateRelationData,
  CreateRelationWithPersonData,
  TreeNode,
  GraphData,
  NeighborhoodData,
  NeighborhoodOptions,
} from './types';

const api = axios.create({
  baseURL: '/api',
});

// Add request interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API functions
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'user' | 'admin';
    createdAt: string;
  };
}

export interface UserInfo {
  id: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth/login', { username, password });
  return res.data;
}

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth/register', { username, password });
  return res.data;
}

export async function getCurrentUser(): Promise<UserInfo> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function getUsers(): Promise<UserInfo[]> {
  const res = await api.get('/users');
  return res.data;
}

export async function updateUserRole(id: string, role: string): Promise<UserInfo> {
  const res = await api.put(`/users/${id}/role`, { role });
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post('/auth/change-password', { currentPassword, newPassword });
  return res.data;
}

// Person API functions
export async function getPersons(): Promise<Person[]> {
  const res = await api.get('/persons');
  return res.data;
}

export async function getPerson(id: string): Promise<PersonDetail> {
  const res = await api.get(`/persons/${id}`);
  return res.data;
}

export async function createPerson(data: CreatePersonData): Promise<Person> {
  const res = await api.post('/persons', data);
  return res.data;
}

export async function updatePerson(id: string, data: CreatePersonData): Promise<Person> {
  const res = await api.put(`/persons/${id}`, data);
  return res.data;
}

export async function deletePerson(id: string): Promise<void> {
  await api.delete(`/persons/${id}`);
}

export async function createRelation(data: CreateRelationData): Promise<{ id: string }> {
  const res = await api.post('/relations', data);
  return res.data;
}

export async function createRelationWithPerson(data: CreateRelationWithPersonData): Promise<{ relation: { id: string }; person: Person }> {
  const res = await api.post('/relations/with-person', data);
  return res.data;
}

export async function deleteRelation(id: string): Promise<void> {
  await api.delete(`/relations/${id}`);
}

export async function getAncestors(id: string): Promise<TreeNode> {
  const res = await api.get(`/tree/ancestors/${id}`);
  return res.data;
}

export async function getDescendants(id: string): Promise<TreeNode> {
  const res = await api.get(`/tree/descendants/${id}`);
  return res.data;
}

export async function getGraph(): Promise<GraphData> {
  const res = await api.get('/tree/graph');
  return res.data;
}

/** Fetch the bounded graph around one person for the generational tree view. */
export async function getNeighborhood(
  id: string,
  options: NeighborhoodOptions = {}
): Promise<NeighborhoodData> {
  const res = await api.get(`/tree/neighborhood/${id}`, { params: options });
  return res.data;
}

/** Ask the server which person the tree should open on when nothing is stored. */
export async function getDefaultFocus(): Promise<string | null> {
  const res = await api.get('/tree/default-focus');
  return res.data?.id ?? null;
}
