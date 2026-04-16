import { Link } from 'react-router-dom';
import Logo from '../Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo size="sm" />
          <span>FixmaCity</span>
        </div>

        <div className="footer-links">
          <Link to="/about" className="footer-link">À Propos</Link>
          <Link to="/contact" className="footer-link">Contact</Link>
          <Link to="/privacy" className="footer-link">Confidentialité</Link>
          <Link to="/terms" className="footer-link">Conditions</Link>
        </div>
      </div>
      <p className="footer-copy">
        © {new Date().getFullYear()} FixmaCity — Municipalité de Sousse. Tous droits réservés.
      </p>
    </footer>
  );
}
