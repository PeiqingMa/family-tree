import axios from 'axios';
import type {
  Person,
  PersonDetail,
  CreatePersonData,
  CreateRelationData,
  CreateRelationWithPersonData,
  TreeNode,
  GraphData,
} from './types';

const api = axios.create({
  baseURL: '/api',
});

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
