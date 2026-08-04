import { useEffect, useState } from 'react';
import { getPersons, createRelation, createRelationWithPerson } from '../api';
import type { Person, CreatePersonData } from '../types';
import { getDisplayName } from '../utils';

interface RelationFormProps {
  personId: number;
  onSuccess: () => void;
}

const parentSubTypes = ['BioFather', 'BioMother', 'FosterFather', 'FosterMother', 'Unknown'];
const childSubTypes = ['Bio', 'Adopted'];

function RelationForm({ personId, onSuccess }: RelationFormProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationType, setRelationType] = useState('parent');
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');
  const [subType, setSubType] = useState('');
  const [spouseFrom, setSpouseFrom] = useState('');
  const [spouseEnd, setSpouseEnd] = useState('');
  const [createNew, setCreateNew] = useState(false);
  const [newGivenName, setNewGivenName] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newBioGender, setNewBioGender] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPersons().then(setPersons).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (createNew) {
        const newPerson: CreatePersonData = {
          names: [{ familyName: newFamilyName, givenName: newGivenName }],
          bioGender: newBioGender || undefined,
        };
        await createRelationWithPerson({
          existingPersonId: personId,
          newPerson,
          relationType,
          subType: subType || undefined,
          spouseFrom: spouseFrom || undefined,
          spouseEnd: spouseEnd || undefined,
        });
      } else {
        if (!selectedPersonId) {
          setError('Please select a person');
          return;
        }
        // For parent relation: fromPersonId is the child (current person), toPersonId is the parent (selected person)
        // For child relation: fromPersonId is the parent (current person), toPersonId is the child (selected person)
        // For spouse relation: bidirectional
        let fromId: number;
        let toId: number;
        if (relationType === 'parent') {
          fromId = personId;
          toId = Number(selectedPersonId);
        } else if (relationType === 'child') {
          fromId = personId;
          toId = Number(selectedPersonId);
        } else {
          fromId = personId;
          toId = Number(selectedPersonId);
        }
        await createRelation({
          fromPersonId: fromId,
          toPersonId: toId,
          relationType,
          subType: subType || undefined,
          spouseFrom: spouseFrom || undefined,
          spouseEnd: spouseEnd || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const availablePersons = persons.filter((p) => p.id !== personId);

  return (
    <form className="relation-form" onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label>Relation Type</label>
          <select value={relationType} onChange={(e) => { setRelationType(e.target.value); setSubType(''); }}>
            <option value="parent">Parent</option>
            <option value="child">Child</option>
            <option value="spouse">Spouse</option>
          </select>
        </div>
        <div className="form-group">
          <label>Sub Type</label>
          {relationType === 'parent' && (
            <select value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="">-- Select --</option>
              {parentSubTypes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {relationType === 'child' && (
            <select value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="">-- Select --</option>
              {childSubTypes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {relationType === 'spouse' && (
            <input type="text" value={subType} onChange={(e) => setSubType(e.target.value)} placeholder="Optional" />
          )}
        </div>
      </div>

      {relationType === 'spouse' && (
        <div className="form-row">
          <div className="form-group">
            <label>Marriage Date</label>
            <input type="text" value={spouseFrom} onChange={(e) => setSpouseFrom(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="text" value={spouseEnd} onChange={(e) => setSpouseEnd(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>
      )}

      <div className="form-group">
        <label>
          <input type="checkbox" checked={createNew} onChange={(e) => setCreateNew(e.target.checked)} />
          {' '}Create new person
        </label>
      </div>

      {createNew ? (
        <div className="form-row">
          <div className="form-group">
            <label>Given Name</label>
            <input type="text" value={newGivenName} onChange={(e) => setNewGivenName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Family Name</label>
            <input type="text" value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select value={newBioGender} onChange={(e) => setNewBioGender(e.target.value)}>
              <option value="">-- Select --</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label>Select Person</label>
          <select value={selectedPersonId} onChange={(e) => setSelectedPersonId(Number(e.target.value))}>
            <option value="">-- Select a person --</option>
            {availablePersons.map((p) => (
              <option key={p.id} value={p.id}>{getDisplayName(p)}</option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="btn btn-primary">Add Relation</button>
    </form>
  );
}

export default RelationForm;
