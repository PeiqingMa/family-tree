export type RelationType = 'parent' | 'child' | 'spouse';

export type ParentType = 'BioFather' | 'BioMother' | 'FosterFather' | 'FosterMother' | 'Unknown';

export type ChildType = 'Bio' | 'Adopted';

export interface Relation {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationType: RelationType;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
  createdAt?: string;
}

export interface RelationCreate {
  fromPersonId: string;
  toPersonId: string;
  relationType: RelationType;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}

export interface RelationWithPersonCreate {
  existingPersonId: string;
  relationType: RelationType;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
  newPerson: {
    names: Array<{
      familyName?: string;
      givenName?: string;
      middleName?: string;
      fullName?: string;
      nameType?: string;
      nameOrder?: string;
    }>;
    bioGender?: string;
    socialGender?: string;
    lifeFrom?: string;
    lifeEnd?: string;
    birthPlace?: string;
    deathPlace?: string;
    details?: string;
    photos?: string[];
  };
}
