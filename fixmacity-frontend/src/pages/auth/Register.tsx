import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API call to /api/auth/register
    console.log('Register:', form);
  };

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-logo">
          <Logo size="lg" />
        </div>

        <h1 className="auth-title">Créer un compte</h1>
        <p className="auth-subtitle">Rejoignez la communauté citoyenne de Sousse</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="reg-firstname">Prénom</label>
              <input
                id="reg-firstname"
                type="text"
                className="input-field"
                placeholder="Ahmed"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="reg-lastname">Nom</label>
              <input
                id="reg-lastname"
                type="text"
                className="input-field"
                placeholder="Ben Ali"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-email">Adresse Email</label>
            <input
              id="reg-email"
              type="email"
              className="input-field"
              placeholder="votre@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-phone">Numéro de Téléphone</label>
            <input
              id="reg-phone"
              type="tel"
              className="input-field"
              placeholder="+216 XX XXX XXX"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-password">Mot de passe</label>
            <input
              id="reg-password"
              type="password"
              className="input-field"
              placeholder="Minimum 8 caractères"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-confirm">Confirmer le mot de passe</label>
            <input
              id="reg-confirm"
              type="password"
              className="input-field"
              placeholder="Retapez votre mot de passe"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
            Créer mon compte
          </button>
        </form>

        <div className="auth-footer">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
