import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPersons, createRelation, createRelationWithPerson } from '../api';
import type { Person, CreatePersonData } from '../types';
import { getDisplayName } from '../utils';

interface RelationFormProps {
  personId: string;
  onSuccess: () => void;
}

const parentSubTypes = ['BioFather', 'BioMother', 'FosterFather', 'FosterMother', 'Unknown'];
const childSubTypes = ['Bio', 'Adopted'];

function RelationForm({ personId, onSuccess }: RelationFormProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationType, setRelationType] = useState('parent');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
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
          setError(t('relation.pleaseSelect'));
          return;
        }
        let fromId: string;
        let toId: string;
        if (relationType === 'parent') {
          fromId = personId;
          toId = selectedPersonId;
        } else if (relationType === 'child') {
          fromId = personId;
          toId = selectedPersonId;
        } else {
          fromId = personId;
          toId = selectedPersonId;
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
          <label>{t('relation.type')}</label>
          <select value={relationType} onChange={(e) => { setRelationType(e.target.value); setSubType(''); }}>
            <option value="parent">{t('relation.parent')}</option>
            <option value="child">{t('relation.child')}</option>
            <option value="spouse">{t('relation.spouse')}</option>
          </select>
        </div>
        <div className="form-group">
          <label>{t('relation.subType')}</label>
          {relationType === 'parent' && (
            <select value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="">{t('form.select')}</option>
              {parentSubTypes.map((s) => <option key={s} value={s}>{t(`parentSubType.${s}`)}</option>)}
            </select>
          )}
          {relationType === 'child' && (
            <select value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="">{t('form.select')}</option>
              {childSubTypes.map((s) => <option key={s} value={s}>{t(`childSubType.${s}`)}</option>)}
            </select>
          )}
          {relationType === 'spouse' && (
            <input type="text" value={subType} onChange={(e) => setSubType(e.target.value)} placeholder={t('relation.optional')} />
          )}
        </div>
      </div>

      {relationType === 'spouse' && (
        <div className="form-row">
          <div className="form-group">
            <label>{t('relation.marriageDate')}</label>
            <input type="text" value={spouseFrom} onChange={(e) => setSpouseFrom(e.target.value)} placeholder={t('form.datePlaceholder')} />
          </div>
          <div className="form-group">
            <label>{t('relation.endDate')}</label>
            <input type="text" value={spouseEnd} onChange={(e) => setSpouseEnd(e.target.value)} placeholder={t('form.datePlaceholder')} />
          </div>
        </div>
      )}

      <div className="form-group">
        <label>
          <input type="checkbox" checked={createNew} onChange={(e) => setCreateNew(e.target.checked)} />
          {' '}{t('relation.createNew')}
        </label>
      </div>

      {createNew ? (
        <div className="form-row">
          <div className="form-group">
            <label>{t('form.givenName')}</label>
            <input type="text" value={newGivenName} onChange={(e) => setNewGivenName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{t('form.familyName')}</label>
            <input type="text" value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('table.gender')}</label>
            <select value={newBioGender} onChange={(e) => setNewBioGender(e.target.value)}>
              <option value="">{t('form.select')}</option>
              <option value="Male">{t('gender.male')}</option>
              <option value="Female">{t('gender.female')}</option>
              <option value="Other">{t('gender.other')}</option>
              <option value="Unknown">{t('gender.unknown')}</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label>{t('relation.selectPerson')}</label>
          <select value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
            <option value="">{t('form.selectPerson')}</option>
            {availablePersons.map((p) => (
              <option key={p.id} value={p.id}>{getDisplayName(p, locale)}</option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="btn btn-primary">{t('relation.addRelation')}</button>
    </form>
  );
}

export default RelationForm;
