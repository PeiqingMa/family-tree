import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPerson, deletePerson, deleteRelation } from '../api';
import type { PersonDetail as PersonDetailType } from '../types';
import { getDisplayName, getNameDisplay } from '../utils';
import RelationForm from './RelationForm';

function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRelationForm, setShowRelationForm] = useState(false);

  const loadPerson = () => {
    if (!id) return;
    setLoading(true);
    getPerson(Number(id))
      .then(setPerson)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPerson();
  }, [id]);

  const handleDelete = async () => {
    if (!person) return;
    if (!window.confirm(`Delete ${getDisplayName(person)}?`)) return;
    try {
      await deletePerson(person.id);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRelation = async (relationId: number) => {
    if (!window.confirm('Remove this relation?')) return;
    try {
      await deleteRelation(relationId);
      loadPerson();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!person) return <div className="error">Person not found</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{getDisplayName(person)}</h2>
        <div className="actions">
          <Link to={`/persons/${person.id}/edit`} className="btn btn-secondary">Edit</Link>
          <button onClick={handleDelete} className="btn btn-danger">Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Basic Info</h3>
          <dl>
            <dt>Biological Gender</dt>
            <dd>{person.bioGender || '-'}</dd>
            <dt>Social Gender</dt>
            <dd>{person.socialGender || '-'}</dd>
            <dt>Born</dt>
            <dd>{person.lifeFrom || '-'}</dd>
            <dt>Died</dt>
            <dd>{person.lifeEnd || '-'}</dd>
            <dt>Birth Place</dt>
            <dd>{person.birthPlace || '-'}</dd>
            <dt>Death Place</dt>
            <dd>{person.deathPlace || '-'}</dd>
          </dl>
        </div>

        <div className="detail-section">
          <h3>Names</h3>
          {person.names.length === 0 ? (
            <p>No names recorded.</p>
          ) : (
            <ul className="name-list">
              {person.names.map((name, idx) => (
                <li key={idx}>
                  <strong>{getNameDisplay(name)}</strong>
                  {name.nameType && <span className="tag">{name.nameType}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {person.details && (
          <div className="detail-section full-width">
            <h3>Details</h3>
            <p>{person.details}</p>
          </div>
        )}

        {person.photos && person.photos.length > 0 && (
          <div className="detail-section full-width">
            <h3>Photos</h3>
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
          <h3>Parents</h3>
          {person.parents.length === 0 ? (
            <p className="empty-text">No parents recorded.</p>
          ) : (
            <ul className="relation-list">
              {person.parents.map((rel) => (
                <li key={rel.relationId}>
                  <Link to={`/persons/${rel.person.id}`}>{getDisplayName(rel.person)}</Link>
                  {rel.subType && <span className="tag">{rel.subType}</span>}
                  <button className="btn-icon" onClick={() => handleDeleteRelation(rel.relationId)} title="Remove relation">&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relation-group">
          <h3>Children</h3>
          {person.children.length === 0 ? (
            <p className="empty-text">No children recorded.</p>
          ) : (
            <ul className="relation-list">
              {person.children.map((rel) => (
                <li key={rel.relationId}>
                  <Link to={`/persons/${rel.person.id}`}>{getDisplayName(rel.person)}</Link>
                  {rel.subType && <span className="tag">{rel.subType}</span>}
                  <button className="btn-icon" onClick={() => handleDeleteRelation(rel.relationId)} title="Remove relation">&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relation-group">
          <h3>Spouses</h3>
          {person.spouses.length === 0 ? (
            <p className="empty-text">No spouses recorded.</p>
          ) : (
            <ul className="relation-list">
              {person.spouses.map((rel) => (
                <li key={rel.relationId}>
                  <Link to={`/persons/${rel.person.id}`}>{getDisplayName(rel.person)}</Link>
                  {rel.spouseFrom && <span className="tag">from {rel.spouseFrom}</span>}
                  {rel.spouseEnd && <span className="tag">to {rel.spouseEnd}</span>}
                  <button className="btn-icon" onClick={() => handleDeleteRelation(rel.relationId)} title="Remove relation">&times;</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="add-relation-section">
        <button className="btn btn-secondary" onClick={() => setShowRelationForm(!showRelationForm)}>
          {showRelationForm ? 'Cancel' : '+ Add Relation'}
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
