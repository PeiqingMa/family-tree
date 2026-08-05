import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPersons } from '../api';
import type { Person } from '../types';
import { getDisplayName } from '../utils';

function PersonTable() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  useEffect(() => {
    getPersons()
      .then(setPersons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{t('common.error', { message: error })}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('table.title')}</h2>
        <span className="badge">{persons.length} {t('table.total')}</span>
      </div>
      {persons.length === 0 ? (
        <div className="empty-state">
          <p>{t('table.emptyState')}</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('table.name')}</th>
              <th>{t('table.gender')}</th>
              <th>{t('table.birthDate')}</th>
              <th>{t('table.deathDate')}</th>
              <th>{t('table.birthPlace')}</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <tr key={person.id} onClick={() => navigate(`/persons/${person.id}`)}>
                <td className="name-cell">{getDisplayName(person, locale)}</td>
                <td>{person.bioGender || '-'}</td>
                <td>{person.lifeFrom || '-'}</td>
                <td>{person.lifeEnd || '-'}</td>
                <td>{person.birthPlace || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PersonTable;
