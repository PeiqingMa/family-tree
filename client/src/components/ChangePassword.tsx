import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api';

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(t('auth.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to change password';
      setError(message);
    }
  };

  return (
    <div className="form-container">
      <h2>{t('auth.changePassword')}</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('auth.currentPassword')}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('auth.newPassword')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="form-group">
          <label>{t('auth.confirmNewPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {t('auth.changePassword')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            {t('person.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
