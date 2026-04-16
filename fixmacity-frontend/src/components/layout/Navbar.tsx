import { Link, useLocation } from 'react-router-dom';
import Logo from '../Logo';

interface NavbarProps {
  isAuthenticated?: boolean;
  userName?: string;
}

export default function Navbar({ isAuthenticated = false, userName }: NavbarProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <Logo size="md" />
        </Link>

        <div className="navbar-links">
          <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>
            Accueil
          </Link>
          <Link to="/map" className={`navbar-link ${isActive('/map') ? 'active' : ''}`}>
            Carte Interactive
          </Link>
          <Link to="/propositions" className={`navbar-link ${isActive('/propositions') ? 'active' : ''}`}>
            Propositions
          </Link>
          <Link to="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>
            À Propos
          </Link>
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {userName || 'Mon Espace'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-tertiary btn-sm">Connexion</Link>
              <Link to="/register" className="btn btn-primary btn-sm">S'inscrire</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
