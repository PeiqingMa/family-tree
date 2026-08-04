import type { Person, PersonName, GraphNode, RelationPerson } from './types';

export function getDisplayName(person: Person | GraphNode | RelationPerson): string {
  if (!person.names || person.names.length === 0) return 'Unknown';
  const name = person.names[0];
  if (name.fullName) return name.fullName;
  const parts: string[] = [];
  if (name.givenName) parts.push(name.givenName);
  if (name.middleName) parts.push(name.middleName);
  if (name.familyName) parts.push(name.familyName);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

export function getNameDisplay(name: PersonName): string {
  if (name.fullName) return name.fullName;
  const parts: string[] = [];
  if (name.givenName) parts.push(name.givenName);
  if (name.middleName) parts.push(name.middleName);
  if (name.familyName) parts.push(name.familyName);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

export function getBirthYear(person: Person | GraphNode): string {
  if (!person.lifeFrom) return '';
  return person.lifeFrom.substring(0, 4);
}
