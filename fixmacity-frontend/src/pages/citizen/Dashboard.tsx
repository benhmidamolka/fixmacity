import { Link } from 'react-router-dom';

export default function CitizenDashboard() {
  return (
    <>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="dashboard-header">
        <h1 className="dashboard-greeting">Bonjour, Ahmed 👋</h1>
        <p className="dashboard-subtitle">
          Bienvenue sur votre tableau de bord. Voici un résumé de l'état de vos signalements.
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-card--primary">
          <span className="kpi-label">Total Signalements</span>
          <div className="kpi-value">12</div>
          <span className="kpi-change kpi-change--up">↑ 3 ce mois</span>
        </div>
        <div className="kpi-card kpi-card--warning">
          <span className="kpi-label">En Attente</span>
          <div className="kpi-value">4</div>
          <span className="kpi-change">En cours de traitement</span>
        </div>
        <div className="kpi-card kpi-card--success">
          <span className="kpi-label">Résolus</span>
          <div className="kpi-value">7</div>
          <span className="kpi-change kpi-change--up">↑ 2 cette semaine</span>
        </div>
        <div className="kpi-card kpi-card--tertiary">
          <span className="kpi-label">Propositions Votées</span>
          <div className="kpi-value">5</div>
          <span className="kpi-change">3 adoptées</span>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────── */}
      <div style={{ marginTop: 'var(--spacing-2xl)' }}>
        <h2 className="headline-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>Actions Rapides</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <Link to="/dashboard/new-report" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau Signalement
          </Link>
          <Link to="/dashboard/propositions" className="btn btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Voir Propositions
          </Link>
          <Link to="/dashboard/map" className="btn btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Carte Interactive
          </Link>
        </div>
      </div>

      {/* ── Recent Reports ──────────────────────────────────── */}
      <div style={{ marginTop: 'var(--spacing-2xl)' }}>
        <h2 className="headline-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>Mes Derniers Signalements</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Report 1 */}
          <div className="card card-elevated card-accent" style={{ padding: 'var(--spacing-xl) var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                  <h3 className="title-md">Nid-de-poule Avenue Habib Bourguiba</h3>
                  <span className="badge badge-in-progress">En cours</span>
                </div>
                <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Réf: FMC-2026-0142 · Soumis le 14 avril 2026
                </p>
              </div>
              <Link to="/dashboard/reports/1" className="btn btn-tertiary btn-sm">
                Voir détails →
              </Link>
            </div>
          </div>

          {/* Report 2 */}
          <div className="card card-elevated card-accent card-accent--success" style={{ padding: 'var(--spacing-xl) var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                  <h3 className="title-md">Éclairage public défectueux — Rue de France</h3>
                  <span className="badge badge-resolved">Résolu</span>
                </div>
                <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Réf: FMC-2026-0098 · Résolu le 10 avril 2026
                </p>
              </div>
              <Link to="/dashboard/reports/2" className="btn btn-tertiary btn-sm">
                Voir détails →
              </Link>
            </div>
          </div>

          {/* Report 3 */}
          <div className="card card-elevated card-accent card-accent--tertiary" style={{ padding: 'var(--spacing-xl) var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                  <h3 className="title-md">Déchets non collectés — Cité Riadh</h3>
                  <span className="badge badge-waiting">En attente</span>
                </div>
                <p className="body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Réf: FMC-2026-0156 · Soumis le 15 avril 2026
                </p>
              </div>
              <Link to="/dashboard/reports/3" className="btn btn-tertiary btn-sm">
                Voir détails →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
