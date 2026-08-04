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

export async function getPerson(id: number): Promise<PersonDetail> {
  const res = await api.get(`/persons/${id}`);
  return res.data;
}

export async function createPerson(data: CreatePersonData): Promise<Person> {
  const res = await api.post('/persons', data);
  return res.data;
}

export async function updatePerson(id: number, data: CreatePersonData): Promise<Person> {
  const res = await api.put(`/persons/${id}`, data);
  return res.data;
}

export async function deletePerson(id: number): Promise<void> {
  await api.delete(`/persons/${id}`);
}

export async function createRelation(data: CreateRelationData): Promise<{ id: number }> {
  const res = await api.post('/relations', data);
  return res.data;
}

export async function createRelationWithPerson(data: CreateRelationWithPersonData): Promise<{ relation: { id: number }; person: Person }> {
  const res = await api.post('/relations/with-person', data);
  return res.data;
}

export async function deleteRelation(id: number): Promise<void> {
  await api.delete(`/relations/${id}`);
}

export async function getAncestors(id: number): Promise<TreeNode> {
  const res = await api.get(`/tree/ancestors/${id}`);
  return res.data;
}

export async function getDescendants(id: number): Promise<TreeNode> {
  const res = await api.get(`/tree/descendants/${id}`);
  return res.data;
}

export async function getGraph(): Promise<GraphData> {
  const res = await api.get('/tree/graph');
  return res.data;
}
