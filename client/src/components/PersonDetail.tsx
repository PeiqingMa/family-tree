import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPerson, deletePerson, deleteRelation } from '../api';
import type { PersonDetail as PersonDetailType } from '../types';
import { getDisplayName, getNameDisplay } from '../utils';
import RelationForm from './RelationForm';

function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [person, setPerson] = useState<PersonDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRelationForm, setShowRelationForm] = useState(false);

  const loadPerson = () => {
    if (!id) return;
    setLoading(true);
    getPerson(id!)
      .then(setPerson)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPerson();
  }, [id]);

  const handleDelete = async () => {
    if (!person) return;
    if (!window.confirm(t('person.confirmDelete', { name: getDisplayName(person, locale) }))) return;
    try {
      await deletePerson(person.id);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    if (!window.confirm(t('person.removeRelation'))) return;
    try {
      await deleteRelation(relationId);
      loadPerson();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{t('common.error', { message: error })}</div>;
  if (!person) return <div className="error">{t('person.notFound')}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{getDisplayName(person, locale)}</h2>
        <div className="actions">
          <Link to={`/persons/${person.id}/edit`} className="btn btn-secondary">{t('person.edit')}</Link>
          <button onClick={handleDelete} className="btn btn-danger">{t('person.delete')}</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>{t('person.basicInfo')}</h3>
          <dl>
            <dt>{t('form.bioGender')}</dt>
            <dd>{person.bioGender || '-'}</dd>
            <dt>{t('form.socialGender')}</dt>
            <dd>{person.socialGender || '-'}</dd>
            <dt>{t('form.birthDate')}</dt>
            <dd>{person.lifeFrom || '-'}</dd>
            <dt>{t('form.deathDate')}</dt>
            <dd>{person.lifeEnd || '-'}</dd>
            <dt>{t('form.birthPlace')}</dt>
            <dd>{person.birthPlace || '-'}</dd>
            <dt>{t('form.deathPlace')}</dt>
            <dd>{person.deathPlace || '-'}</dd>
          </dl>
        </div>

        <div className="detail-section">
          <h3>{t('person.names')}</h3>
          {person.names.length === 0 ? (
            <p>{t('person.noNames')}</p>
          ) : (
            <ul className="name-list">
              {person.names.map((name, idx) => (
                <li key={idx}>
                  <strong>{getNameDisplay(name, locale)}</strong>
                  {name.nameType && <span className="tag">{name.nameType}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {person.details && (
          <div className="detail-section full-width">
            <h3>{t('person.details')}</h3>
            <p>{person.details}</p>
          </div>
        )}

        {person.photos && person.photos.length > 0 && (
          <div className="detail-section full-width">
            <h3>{t('person.photos')}</h3>
            <div className="photo-list">
              {person.photos.map((url, idx) => (
                <img key={idx} src={url} alt={`Photo ${idx + 1}`} className="photo-thumb" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relations-section">
        <div className="relation-group">
          <h3>{t('person.parents')}</h3>
          {person.parents.length === 0 ? (
            <p className="empty-text">{t('person.noParents')}</p>
          ) : (
            <ul className="relation-list">
              {person.parents.map((rel) => (
                <li key={rel.relationId}>
                  <Link to={`/persons/${rel.person.id}`}>{getDisplayName(rel.person, locale)}</Link>
                  {rel.subType && <span className="tag">{rel.subType}</span>}
                  <button className="btn-icon" onClick={() => handleDeleteRelation(rel.relationId)} title={t('common.removeRelation')}>&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relation-group">
          <h3>{t('person.children')}</h3>
          {person.children.length === 0 ? (
            <p className="empty-text">{t('person.noChildren')}</p>
          ) : (
            <ul className="relation-list">
              {person.children.map((rel) => (
                <li key={rel.relationId}>
                  <Link to={`/persons/${rel.person.id}`}>{getDisplayName(rel.person, locale)}</Link>
                  {rel.subType && <span className="tag">{rel.subType}</span>}
                  <button className="btn-icon" onClick={() => handleDeleteRelation(rel.relationId)} title={t('common.removeRelation')}>&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relation-group">
          <h3>{t('person.spouses')}</h3>
          {person.spouses.length === 0 ? (
            <p className="empty-text">{t('person.noSpouses')}</p>
          ) : (
            <ul className="relation-list">
              {person.spouses.map((rel) => (
                <li key={rel.relationId}>
                  <Link to={`/persons/${rel.person.id}`}>{getDisplayName(rel.person, locale)}</Link>
                  {rel.spouseFrom && <span className="tag">{t('relation.from')} {rel.spouseFrom}</span>}
                  {rel.spouseEnd && <span className="tag">{t('relation.to')} {rel.spouseEnd}</span>}
                  <button className="btn-icon" onClick={() => handleDeleteRelation(rel.relationId)} title={t('common.removeRelation')}>&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="add-relation-section">
        <button className="btn btn-secondary" onClick={() => setShowRelationForm(!showRelationForm)}>
          {showRelationForm ? t('person.cancel') : t('form.addRelation')}
        </button>
        {showRelationForm && (
          <RelationForm
            personId={person.id}
            onSuccess={() => {
              setShowRelationForm(false);
              loadPerson();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default PersonDetail;
