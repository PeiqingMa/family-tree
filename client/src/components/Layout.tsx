import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();

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
        </ul>
        <div className="sidebar-actions">
          <Link to="/persons/new" className="btn btn-primary">
            {t('nav.addPerson')}
          </Link>
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
