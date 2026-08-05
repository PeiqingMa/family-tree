import type { Person, PersonName, GraphNode, RelationPerson, TreeNode } from './types';

type Displayable = Person | GraphNode | RelationPerson | TreeNode;

export function getDisplayName(person: Displayable, locale: string = 'en'): string {
  if (!person.names || person.names.length === 0) return 'Unknown';
  const name = person.names[0];
  // fullName is a verbatim override - it bypasses locale-specific formatting.
  // Users setting fullName should be aware that language switching will not affect display.
  if (name.fullName) return name.fullName;

  if (locale === 'zh') {
    // Chinese: FamilyNameGivenName (no comma, no space)
    const parts: string[] = [];
    if (name.familyName) parts.push(name.familyName);
    if (name.givenName) parts.push(name.givenName);
    if (name.middleName) parts.push(name.middleName);
    return parts.length > 0 ? parts.join('') : 'Unknown';
  }

  // English: "FamilyName, GivenName"
  const familyName = name.familyName || '';
  const givenName = name.givenName || '';
  const middleName = name.middleName || '';

  if (familyName && givenName) {
    const given = middleName ? `${givenName} ${middleName}` : givenName;
    return `${familyName}, ${given}`;
  }

  // Fallback: join whatever parts exist
  const parts: string[] = [];
  if (familyName) parts.push(familyName);
  if (givenName) parts.push(givenName);
  if (middleName) parts.push(middleName);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

export function getNameDisplay(name: PersonName, locale: string = 'en'): string {
  // fullName is a verbatim override - it bypasses locale-specific formatting.
  if (name.fullName) return name.fullName;

  if (locale === 'zh') {
    const parts: string[] = [];
    if (name.familyName) parts.push(name.familyName);
    if (name.givenName) parts.push(name.givenName);
    if (name.middleName) parts.push(name.middleName);
    return parts.length > 0 ? parts.join('') : 'Unknown';
  }

  // English: "FamilyName, GivenName"
  const familyName = name.familyName || '';
  const givenName = name.givenName || '';
  const middleName = name.middleName || '';

  if (familyName && givenName) {
    const given = middleName ? `${givenName} ${middleName}` : givenName;
    return `${familyName}, ${given}`;
  }

  const parts: string[] = [];
  if (familyName) parts.push(familyName);
  if (givenName) parts.push(givenName);
  if (middleName) parts.push(middleName);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

export function getBirthYear(person: Person | GraphNode): string {
  if (!person.lifeFrom) return '';
  return person.lifeFrom.substring(0, 4);
}
