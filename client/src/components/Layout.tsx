import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>Family Tree</h1>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Table View
            </Link>
          </li>
          <li>
            <Link to="/graph" className={location.pathname.startsWith('/graph') ? 'active' : ''}>
              Graph View
            </Link>
          </li>
        </ul>
        <div className="sidebar-actions">
          <Link to="/persons/new" className="btn btn-primary">
            + Add Person
          </Link>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
