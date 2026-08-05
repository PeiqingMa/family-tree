import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>{t('nav.familyTree')}</h1>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              {t('nav.tableView')}
            </Link>
          </li>
          <li>
            <Link to="/graph" className={location.pathname.startsWith('/graph') ? 'active' : ''}>
              {t('nav.graphView')}
            </Link>
          </li>
          {isAdmin && (
            <li>
              <Link to="/admin/users" className={location.pathname === '/admin/users' ? 'active' : ''}>
                {t('auth.userManagement')}
              </Link>
            </li>
          )}
        </ul>
        {isAuthenticated && (
          <div className="sidebar-actions">
            <Link to="/persons/new" className="btn btn-primary">
              {t('nav.addPerson')}
            </Link>
          </div>
        )}
        <div className="sidebar-auth">
          {isAuthenticated ? (
            <div className="auth-info">
              <span className="username">{user?.username}</span>
              <Link to="/change-password" className="btn btn-secondary btn-sm">
                {t('auth.changePassword')}
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                {t('auth.logout')}
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-secondary">
              {t('auth.login')}
            </Link>
          )}
        </div>
        <LanguageSwitcher />
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
