export interface PersonName {
  id?: string;
  personId?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  fullName?: string;
  nameType?: string;
  nameOrder?: NameOrder;
}

export type NameOrder = 'FamilyNameFirst' | 'GivenNameFirst';

export type BioGender = 'Male' | 'Female' | 'Other' | 'Unknown';

export interface Person {
  id: string;
  names: PersonName[];
  bioGender?: BioGender;
  socialGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
  birthPlace?: string;
  deathPlace?: string;
  details?: string;
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
  parents?: RelationView[];
  spouses?: RelationView[];
  children?: RelationView[];
}

export interface PersonCreate {
  names: PersonName[];
  bioGender?: BioGender;
  socialGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
  birthPlace?: string;
  deathPlace?: string;
  details?: string;
  photos?: string[];
}

export interface PersonUpdate {
  names?: PersonName[];
  bioGender?: BioGender;
  socialGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
  birthPlace?: string;
  deathPlace?: string;
  details?: string;
  photos?: string[];
}

export interface RelationView {
  relationId: string;
  person: PersonSummary;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}

export interface PersonSummary {
  id: string;
  names: PersonName[];
  bioGender?: BioGender;
}
