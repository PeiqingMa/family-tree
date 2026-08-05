import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPerson, getPerson, updatePerson } from '../api';
import type { PersonName, CreatePersonData } from '../types';

interface NameEntry {
  familyName: string;
  givenName: string;
  middleName: string;
  fullName: string;
  nameType: string;
  nameOrder: string;
}

function emptyName(): NameEntry {
  return { familyName: '', givenName: '', middleName: '', fullName: '', nameType: '', nameOrder: 'FamilyNameFirst' };
}

function PersonForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = !!id;

  const [names, setNames] = useState<NameEntry[]>([emptyName()]);
  const [bioGender, setBioGender] = useState('');
  const [socialGender, setSocialGender] = useState('');
  const [lifeFrom, setLifeFrom] = useState('');
  const [lifeEnd, setLifeEnd] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      getPerson(id!)
        .then((person) => {
          if (person.names.length > 0) {
            setNames(
              person.names.map((n: PersonName) => ({
                familyName: n.familyName || '',
                givenName: n.givenName || '',
                middleName: n.middleName || '',
                fullName: n.fullName || '',
                nameType: n.nameType || '',
                nameOrder: n.nameOrder || 'FamilyNameFirst',
              }))
            );
          }
          setBioGender(person.bioGender || '');
          setSocialGender(person.socialGender || '');
          setLifeFrom(person.lifeFrom || '');
          setLifeEnd(person.lifeEnd || '');
          setBirthPlace(person.birthPlace || '');
          setDeathPlace(person.deathPlace || '');
          setDetails(person.details || '');
          setPhotos(person.photos || []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleNameChange = (index: number, field: keyof NameEntry, value: string) => {
    const updated = [...names];
    updated[index][field] = value;
    setNames(updated);
  };

  const addName = () => setNames([...names, emptyName()]);
  const removeName = (index: number) => {
    if (names.length <= 1) return;
    setNames(names.filter((_, i) => i !== index));
  };

  const addPhoto = () => setPhotos([...photos, '']);
  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));
  const updatePhoto = (index: number, value: string) => {
    const updated = [...photos];
    updated[index] = value;
    setPhotos(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data: CreatePersonData = {
      names: names.map((n) => ({
        familyName: n.familyName,
        givenName: n.givenName,
        middleName: n.middleName || undefined,
        fullName: n.fullName || undefined,
        nameType: n.nameType || undefined,
        nameOrder: n.nameOrder,
      })),
      bioGender: bioGender || undefined,
      socialGender: socialGender || undefined,
      lifeFrom: lifeFrom || undefined,
      lifeEnd: lifeEnd || undefined,
      birthPlace: birthPlace || undefined,
      deathPlace: deathPlace || undefined,
      details: details || undefined,
      photos: photos.filter((p) => p.trim() !== ''),
    };

    try {
      if (isEdit) {
        await updatePerson(id!, data);
        navigate(`/persons/${id}`);
      } else {
        const created = await createPerson(data);
        navigate(`/persons/${created.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <div className="loading">{t('common.loading')}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{isEdit ? t('person.editPerson') : t('person.addPerson')}</h2>
      </div>

      {error && <div className="error">{error}</div>}

      <form className="person-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>{t('person.names')}</legend>
          {names.map((name, idx) => (
            <div key={idx} className="name-entry">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('form.givenName')}</label>
                  <input type="text" value={name.givenName} onChange={(e) => handleNameChange(idx, 'givenName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('form.middleName')}</label>
                  <input type="text" value={name.middleName} onChange={(e) => handleNameChange(idx, 'middleName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('form.familyName')}</label>
                  <input type="text" value={name.familyName} onChange={(e) => handleNameChange(idx, 'familyName', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('form.fullName')}</label>
                  <input type="text" value={name.fullName} onChange={(e) => handleNameChange(idx, 'fullName', e.target.value)} placeholder={t('form.optionalOverride')} />
                </div>
                <div className="form-group">
                  <label>{t('form.nameType')}</label>
                  <input type="text" value={name.nameType} onChange={(e) => handleNameChange(idx, 'nameType', e.target.value)} placeholder={t('form.nameTypePlaceholder')} />
                </div>
                {names.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeName(idx)}>{t('form.remove')}</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addName}>{t('form.addName')}</button>
        </fieldset>

        <fieldset>
          <legend>{t('person.personalInfo')}</legend>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.bioGender')}</label>
              <select value={bioGender} onChange={(e) => setBioGender(e.target.value)}>
                <option value="">{t('form.select')}</option>
                <option value="Male">{t('gender.male')}</option>
                <option value="Female">{t('gender.female')}</option>
                <option value="Other">{t('gender.other')}</option>
                <option value="Unknown">{t('gender.unknown')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('form.socialGender')}</label>
              <input type="text" value={socialGender} onChange={(e) => setSocialGender(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.birthDate')}</label>
              <input type="text" value={lifeFrom} onChange={(e) => setLifeFrom(e.target.value)} placeholder={t('form.datePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('form.deathDate')}</label>
              <input type="text" value={lifeEnd} onChange={(e) => setLifeEnd(e.target.value)} placeholder={t('form.datePlaceholder')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.birthPlace')}</label>
              <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('form.deathPlace')}</label>
              <input type="text" value={deathPlace} onChange={(e) => setDeathPlace(e.target.value)} />
            </div>
          </div>
          <div className="form-group full-width">
            <label>{t('form.details')}</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('person.photos')}</legend>
          {photos.map((url, idx) => (
            <div key={idx} className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <input type="text" value={url} onChange={(e) => updatePhoto(idx, e.target.value)} placeholder={t('form.photoUrl')} />
              </div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removePhoto(idx)}>{t('form.remove')}</button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addPhoto}>{t('form.addPhoto')}</button>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{isEdit ? t('person.saveChanges') : t('person.createPerson')}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>{t('person.cancel')}</button>
        </div>
      </form>
    </div>
  );
}

export default PersonForm;
