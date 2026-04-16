import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner section">
          <div className="hero-content">
            <span className="hero-overline label-md">MUNICIPALITÉ DE SOUSSE</span>
            <h1 className="display-lg hero-title">
              Signaler. Suivre.<br />
              <span className="hero-accent">Améliorer votre ville.</span>
            </h1>
            <p className="body-lg hero-description">
              FixmaCity connecte les citoyens de Sousse avec leur municipalité. Signalez des problèmes urbains,
              suivez leur résolution en temps réel et participez aux propositions citoyennes pour une ville meilleure.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Commencer Maintenant
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link to="/map" className="btn btn-secondary btn-lg">
                Explorer la Carte
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card card card-glass">
              <div className="hero-stat">
                <span className="hero-stat-number display-md">1,247</span>
                <span className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>Signalements résolus</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-number display-md" style={{ color: 'var(--color-success)' }}>94%</span>
                <span className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>Taux de satisfaction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="section how-it-works">
        <div className="section-header">
          <span className="label-md section-overline">COMMENT ÇA MARCHE</span>
          <h2 className="headline-lg">Un processus simple et transparent</h2>
          <p className="body-lg section-description">
            Trois étapes pour améliorer votre quartier
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card card card-elevated">
            <div className="step-number">01</div>
            <h3 className="title-lg">Signalez</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Prenez une photo, localisez le problème sur la carte et décrivez la situation.
              L'assistant intelligent vous guide à chaque étape.
            </p>
          </div>
          <div className="step-card card card-elevated">
            <div className="step-number">02</div>
            <h3 className="title-lg">Suivez</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Recevez des notifications en temps réel sur l'avancement de votre signalement.
              Chaque étape est visible et transparente.
            </p>
          </div>
          <div className="step-card card card-elevated">
            <div className="step-number">03</div>
            <h3 className="title-lg">Participez</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Votez pour les propositions citoyennes, évaluez les réparations et contribuez
              à un Sousse plus beau et plus fonctionnel.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="section features-section">
        <div className="section-header">
          <span className="label-md section-overline">FONCTIONNALITÉS</span>
          <h2 className="headline-lg">Une plateforme complète pour votre ville</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card card-accent">
            <div className="feature-icon feature-icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="title-lg">Carte Interactive</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Visualisez tous les signalements sur une carte interactive de Sousse. Filtrez par statut,
              catégorie et quartier.
            </p>
          </div>

          <div className="feature-card card-accent">
            <div className="feature-icon feature-icon--secondary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="title-lg">Mosa3ed Baladia</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Un assistant intelligent qui vous guide pour soumettre vos signalements et répondre
              à vos questions sur les services municipaux.
            </p>
          </div>

          <div className="feature-card card-accent">
            <div className="feature-icon feature-icon--tertiary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h3 className="title-lg">Suivi en Temps Réel</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Suivez chaque étape du traitement de votre signalement, de la réception à la résolution complète.
            </p>
          </div>

          <div className="feature-card card-accent card-accent--success">
            <div className="feature-icon feature-icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </div>
            <h3 className="title-lg">Propositions Citoyennes</h3>
            <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Proposez des idées d'amélioration et votez pour les initiatives de vos concitoyens
              pour construire ensemble l'avenir de Sousse.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────── */}
      <section className="cta-section">
        <div className="section cta-content">
          <Logo size="lg" />
          <h2 className="headline-lg" style={{ marginTop: 'var(--spacing-xl)', color: 'var(--color-on-primary)' }}>
            Prêt à améliorer Sousse ?
          </h2>
          <p className="body-lg" style={{ color: 'var(--color-primary-fixed-dim)', maxWidth: '520px', textAlign: 'center', margin: 'var(--spacing-md) auto 0' }}>
            Rejoignez des milliers de citoyens engagés et contribuez à rendre Sousse plus belle,
            plus propre et plus fonctionnelle.
          </p>
          <Link to="/register" className="btn btn-lg cta-btn" style={{ marginTop: 'var(--spacing-2xl)' }}>
            Créer mon compte gratuitement
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
