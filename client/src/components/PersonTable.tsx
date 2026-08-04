import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPersons } from '../api';
import type { Person } from '../types';
import { getDisplayName } from '../utils';

function PersonTable() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getPersons()
      .then(setPersons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>All People</h2>
        <span className="badge">{persons.length} total</span>
      </div>
      {persons.length === 0 ? (
        <div className="empty-state">
          <p>No people added yet. Click "Add Person" to get started.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Gender</th>
              <th>Birth Date</th>
              <th>Death Date</th>
              <th>Birth Place</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <tr key={person.id} onClick={() => navigate(`/persons/${person.id}`)}>
                <td className="name-cell">{getDisplayName(person)}</td>
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
