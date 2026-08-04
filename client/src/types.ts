export interface PersonName {
  id?: string;
  personId?: string;
  familyName: string;
  givenName: string;
  middleName?: string;
  fullName?: string;
  nameType?: string;
  nameOrder?: string;
}

export interface Person {
  id: string;
  names: PersonName[];
  bioGender?: string;
  socialGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
  birthPlace?: string;
  deathPlace?: string;
  details?: string;
  photos?: string[];
}

export interface RelationPerson {
  id: string;
  names: PersonName[];
  bioGender?: string;
}

export interface RelationView {
  relationId: string;
  person: RelationPerson;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}

export interface PersonDetail extends Person {
  parents: RelationView[];
  children: RelationView[];
  spouses: RelationView[];
}

export interface TreeNode {
  id: string;
  names: PersonName[];
  bioGender?: string;
  ancestors?: TreeNode[];
  descendants?: TreeNode[];
}

export interface GraphNode {
  id: string;
  names: PersonName[];
  bioGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
}

export interface GraphEdge {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CreatePersonData {
  names: Omit<PersonName, 'id' | 'personId'>[];
  bioGender?: string;
  socialGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
  birthPlace?: string;
  deathPlace?: string;
  details?: string;
  photos?: string[];
}

export interface CreateRelationData {
  fromPersonId: string;
  toPersonId: string;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}

export interface CreateRelationWithPersonData {
  existingPersonId: string;
  newPerson: CreatePersonData;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}
