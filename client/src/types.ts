export interface PersonName {
  id?: number;
  personId?: number;
  familyName: string;
  givenName: string;
  middleName?: string;
  fullName?: string;
  nameType?: string;
  nameOrder?: number;
}

export interface Person {
  id: number;
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
  id: number;
  names: PersonName[];
  bioGender?: string;
}

export interface RelationView {
  relationId: number;
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
  id: number;
  names: PersonName[];
  bioGender?: string;
  parents?: TreeNode[];
  children?: TreeNode[];
}

export interface GraphNode {
  id: number;
  names: PersonName[];
  bioGender?: string;
  lifeFrom?: string;
  lifeEnd?: string;
}

export interface GraphEdge {
  id: number;
  fromPersonId: number;
  toPersonId: number;
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
  fromPersonId: number;
  toPersonId: number;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}

export interface CreateRelationWithPersonData {
  existingPersonId: number;
  newPerson: CreatePersonData;
  relationType: string;
  subType?: string;
  spouseFrom?: string;
  spouseEnd?: string;
}
