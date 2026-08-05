import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getUsers, updateUserRole, deleteUser } from '../api';
import type { UserInfo } from '../api';

function UserManagement() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!window.confirm(t('auth.confirmDeleteUser', { username }))) return;
    try {
      await deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{t('common.error', { message: error })}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('auth.userManagement')}</h2>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('auth.username')}</th>
            <th>{t('auth.role')}</th>
            <th>{t('auth.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  disabled={u.id === currentUser?.id}
                >
                  <option value="user">{t('auth.roleUser')}</option>
                  <option value="admin">{t('auth.roleAdmin')}</option>
                </select>
              </td>
              <td>
                {u.id !== currentUser?.id && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(u.id, u.username)}
                  >
                    {t('person.delete')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserManagement;
