import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API call to /api/auth/forgot-password
    console.log('Forgot password:', email);
    setSubmitted(true);
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo size="lg" />
        </div>

        {submitted ? (
          <>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-success-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--spacing-xl)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="auth-title">Email envoyé !</h1>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>
                Si un compte existe avec l'adresse <strong>{email}</strong>,
                vous recevrez un lien de réinitialisation dans quelques instants.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--spacing-xl)' }}>
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title">Mot de passe oublié</h1>
            <p className="auth-subtitle">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label" htmlFor="forgot-email">Adresse Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="input-field"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Envoyer le lien
              </button>
            </form>

            <div className="auth-footer">
              <Link to="/login">← Retour à la connexion</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
