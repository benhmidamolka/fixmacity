import { useState, useRef, useEffect, useCallback } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────
type PageId = "dashboard" | "my-reports" | "map" | "new-report" | "propositions";
type ChatRole = "user" | "bot";
interface ChatMessage { text: string; role: ChatRole; time: string }
interface Report { id: string; emoji: string; bg: string; status: "en-cours" | "en-attente" | "termine"; title: string; addr: string; ref: string; ago: string }
interface Proposition { id: string; category: string; title: string; desc: string; pct: number; deadline?: string; approved?: boolean }

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const REPORTS: Report[] = [
  { id: "r1", emoji: "💡", bg: "linear-gradient(135deg,#1B3A6B,#0A1F42)", status: "en-cours",   title: "Éclairage Public en Panne",       addr: "Avenue Habib Bourguiba, Sousse",   ref: "SV-22-04-26-0042", ago: "il y a 2h" },
  { id: "r2", emoji: "🌿", bg: "linear-gradient(135deg,#1a3a0f,#2d6b18)",  status: "en-attente", title: "Arbre tombé — Risque passage",    addr: "Rue Hedi Chaker, Sousse Jawhara",  ref: "SJ-21-04-26-0018", ago: "il y a 1 jour" },
  { id: "r3", emoji: "🕳️", bg: "linear-gradient(135deg,#3a1a0f,#6b2d18)",  status: "termine",   title: "Nid-de-poule Rue des Orangers",   addr: "Rue des Orangers, Medina Sousse",  ref: "SV-17-04-26-0031", ago: "il y a 5 jours" },
];

const PROPOSITIONS: Proposition[] = [
  { id: "p1", category: "ENVIRONNEMENT", title: "Végétalisation de la place des Martyrs",    desc: "Projet de création d'un jardin urbain vertical et de 20 nouveaux bancs ombragés pour réduire les îlots de chaleur.", pct: 62, deadline: "Finit dans 3 jours" },
  { id: "p2", category: "MOBILITÉ",      title: "Extension des Pistes Cyclables (Phase 2)", desc: "Vote terminé. Approuvé à 74% par les citoyens de Sousse.", pct: 74, approved: true },
  { id: "p3", category: "NUMÉRIQUE",     title: "Wifi Gratuit — Centre Ville Sousse",        desc: "Déploiement de 40 bornes wifi publiques dans les espaces piétonniers du centre-ville.", pct: 81, deadline: "Finit dans 7 jours" },
];

const CATEGORIES = [
  { emoji: "🛣️", name: "Voirie",         desc: "Potholes, sidewalks, roads",  bg: "#FFF0E8" },
  { emoji: "💡", name: "Éclairage",       desc: "Street lights, dark zones",   bg: "#EBF2FF" },
  { emoji: "🌿", name: "Espaces Verts",   desc: "Parks, gardens, trees",       bg: "#E8FAF3" },
  { emoji: "🗑️", name: "Propreté",        desc: "Waste, illegal dumping",      bg: "#F0FAF4" },
  { emoji: "💧", name: "Assainissement",  desc: "Water leaks, drains",         bg: "#EBF7FF" },
  { emoji: "···",name: "Other",           desc: "General inquiries",           bg: "#F4F7FC" },
];

const BOT_REPLIES: Record<string, string> = {
  "suivre mon signalement": "Votre signalement SV-22-04-26-0042 est actuellement <strong>EN COURS</strong>. L'équipe municipale est sur place et la résolution est prévue avant 21h00 ce soir. 🔧",
  "comment signaler ?":     "Pour signaler un problème, cliquez sur le bouton <strong>\"Signaler\"</strong> en haut à droite. En 3 étapes : choisissez la catégorie, localisez sur la carte, et décrivez le problème. 📍",
  "statut de ma demande":   "Vous avez <strong>3 signalements actifs</strong> :<br>• SV-22-04-26-0042 — EN COURS 🔵<br>• SJ-21-04-26-0018 — EN ATTENTE 🟠<br>• SV-17-04-26-0031 — TERMINÉ ✅",
  default:                  "Je comprends votre question. Pour plus d'aide, vous pouvez contacter la municipalité de Sousse directement ou consulter notre page d'aide. 😊",
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: Report["status"] }) {
  const map = {
    "en-cours":   { cls: "status-en-cours",   dot: "dot-blue",   label: "EN COURS"   },
    "en-attente": { cls: "status-en-attente", dot: "dot-orange", label: "EN ATTENTE" },
    "termine":    { cls: "status-termine",    dot: "dot-green",  label: "TERMINÉ"    },
  } as const;
  const { cls, dot, label } = map[status];
  return (
    <span className={`status-badge ${cls}`}>
      <span className={`status-dot ${dot}`} />
      {label}
    </span>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  );
}

// ── NAVBAR ─────────────────────────────────────────────────────────────────
function Navbar({ activePage, setPage, onChatToggle }: { activePage: PageId; setPage: (p: PageId) => void; onChatToggle: () => void }) {
  const links: { id: PageId; label: string }[] = [
    { id: "dashboard",    label: "Tableau de bord" },
    { id: "my-reports",  label: "Mes Signalements" },
    { id: "map",         label: "Carte" },
    { id: "propositions",label: "Propositions" },
  ];
  return (
    <nav className="navbar">
      <button className="nav-logo" onClick={() => setPage("dashboard")}>
        <div className="nav-logo-icon">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <rect x={2} y={13} width={5} height={9} rx={1} fill="white" fillOpacity=".9" />
            <rect x={9} y={8} width={6} height={14} rx={1} fill="white" />
            <rect x={17} y={4} width={5} height={18} rx={1} fill="white" fillOpacity=".7" />
            <circle cx={12} cy={3} r={2} fill="#5B9FFF" />
            <line x1={12} y1={5} x2={12} y2={8} stroke="#5B9FFF" strokeWidth={1.5} />
          </svg>
        </div>
        <span className="nav-logo-text">Fix<span>Ma</span>City</span>
      </button>

      <div className="nav-links">
        {links.map(l => (
          <button
            key={l.id}
            className={`nav-link ${activePage === l.id ? "active" : ""}`}
            onClick={() => setPage(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="nav-right">
        <button className="nav-bell" onClick={onChatToggle} aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={18} height={18}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <div className="bell-badge" />
        </button>
        <div className="nav-avatar">SM</div>
        <button className="btn-report" onClick={() => setPage("new-report")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
            <line x1={12} y1={5} x2={12} y2={19} />
            <line x1={5} y1={12} x2={19} y2={12} />
          </svg>
          Signaler
        </button>
      </div>
    </nav>
  );
}

// ── DASHBOARD PAGE ─────────────────────────────────────────────────────────
function Dashboard({ setPage, votes, setVotes }: {
  setPage: (p: PageId) => void;
  votes: Record<string, boolean>;
  setVotes: (v: Record<string, boolean>) => void;
}) {
  return (
    <div className="dashboard fade-in">
      {/* Greeting */}
      <div className="greeting-card">
        <div className="greeting-card-bg1" />
        <div className="greeting-card-bg2" />
        <div className="greeting-grid">
          <div>
            <div className="greeting-subtitle">Espace Citoyen · Sousse</div>
            <h1 className="greeting-title">Bonjour, <em>Sami</em></h1>
            <p className="greeting-tagline">Sousse Digital Curator · Votre ville vous écoute aujourd'hui.</p>
          </div>
          <div className="greeting-stats">
            <div className="g-stat"><div className="g-stat-num">3</div><div className="g-stat-label">Signalements actifs</div></div>
            <div className="g-stat"><div className="g-stat-num">84</div><div className="g-stat-label">Problèmes résolus</div></div>
            <div className="g-stat"><div className="g-stat-num">2,450</div><div className="g-stat-label">Points Civic</div></div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        {[
          { label: "Signalements actifs", value: "12",   icon: "📡", bg: "#EBF2FF" },
          { label: "Problèmes résolus",    value: "84",   icon: "✅", bg: "#E8FAF3" },
          { label: "Points Civic",         value: "2,450",icon: "🏆", bg: "#FFF8E8" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
            <div className="kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="section-header">
        <div>
          <div className="section-title">Mes Signalements</div>
          <div className="section-sub">Suivez l'évolution de vos demandes en temps réel.</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="link-all" onClick={() => setPage("my-reports")}>
            Voir tout
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button className="btn-report" onClick={() => setPage("new-report")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}><line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/></svg>
            Nouveau signalement
          </button>
        </div>
      </div>

      {/* Declaration Card */}
      <div className="decl-card">
        <div className="decl-card-inner">
          <div className="decl-photo" style={{ background: "linear-gradient(135deg,#1B3A6B,#0A1F42)" }}>
            <span style={{ fontSize: 64 }}>💡</span>
            <div className="decl-photo-overlay">
              <span className="tag tag-urgent">Urgent</span>
              <span className="tag tag-infra">Infrastructure</span>
            </div>
          </div>
          <div className="decl-body">
            <div className="decl-status-row">
              <StatusBadge status="en-cours" />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Mis à jour il y a 2h</span>
            </div>
            <div className="decl-title">Éclairage Public en Panne</div>
            <div className="decl-addr">
              <PinIcon />
              Avenue Habib Bourguiba, Sousse. Lampadaire #421.
            </div>
            {/* Stepper */}
            <div>
              <div className="stepper">
                {["step-done","step-done","step-active","step-upcoming"].map((cls, i) => (
                  <>
                    <div key={`n${i}`} className={`step-node ${cls}`}>
                      {cls === "step-done" ? "✓" : cls === "step-active" ? "👷" : "→"}
                    </div>
                    {i < 3 && <div key={`l${i}`} className={`step-line ${i < 2 ? "step-line-done" : "step-line-upcoming"}`} />}
                  </>
                ))}
              </div>
              <div className="step-label-row">
                {[["Soumis","done"],["Assigné","done"],["En cours","active"],["Résolu","upcoming"]].map(([label, state]) => (
                  <span key={label} className={`step-label step-label-${state}`}>{label}</span>
                ))}
              </div>
            </div>
            {/* Update */}
            <div className="decl-update" style={{ marginTop: 16 }}>
              <div className="update-avatar">🏛️</div>
              <div>
                <div className="update-meta">Équipe Municipale (Secteur Nord) · il y a 2 heures</div>
                <div className="update-text">"<em>Bonjour Sami</em>, notre équipe technique a été dépêchée sur place. Le remplacement de l'ampoule LED est prévu avant 21h00."</div>
              </div>
            </div>
            <div className="decl-ref">SV-22-04-26-0042</div>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="bottom-grid">
        {/* Propositions */}
        <div>
          <div className="section-header">
            <div><div className="section-title">Propositions du Maire</div></div>
            <button className="link-all" onClick={() => setPage("propositions")}>Voir tout →</button>
          </div>
          {PROPOSITIONS.slice(0, 2).map(p => (
            <PropMini key={p.id} p={p} votes={votes} setVotes={setVotes} />
          ))}
        </div>

        {/* Right col */}
        <div>
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div className="section-title">Dernières Réalisations</div>
          </div>
          <div className="recent-grid" style={{ marginBottom: 16 }}>
            {[
              { emoji: "🏗️", bg: "linear-gradient(135deg,#1B3A6B,#2E5B9A)", badge: "RÉALISÉ", title: "Rénovation Corniche", date: "12 Octobre 2023" },
              { emoji: "♻️", bg: "linear-gradient(135deg,#0F6E56,#1D9E75)",  badge: "RÉALISÉ", title: "Collecteurs de Tri",  date: "08 Octobre 2023" },
            ].map(a => (
              <div key={a.title} className="achieve-card">
                <div className="achieve-img" style={{ background: a.bg }}>{a.emoji}</div>
                <div className="achieve-info">
                  <div className="achieve-badge">{a.badge}</div>
                  <div className="achieve-title">{a.title}</div>
                  <div className="achieve-date">{a.date}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="map-insight">
            <div className="map-insight-label">Map Insight</div>
            <div style={{ fontSize: 40 }}>🗺️</div>
            <div className="map-insight-text">"Consultez les autres déclarations dans la carte et votez pour les prioriser afin qu'elles soient traitées plus rapidement."</div>
            <button className="map-btn" onClick={() => setPage("map")}>Consulter la Carte des Fixes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROP MINI ──────────────────────────────────────────────────────────────
function PropMini({ p, votes, setVotes }: { p: Proposition; votes: Record<string, boolean>; setVotes: (v: Record<string, boolean>) => void }) {
  const voted = votes[p.id];
  const barColor = p.approved ? "var(--green)" : "var(--blue)";
  const pctColor = p.approved ? "var(--green)" : "var(--blue)";
  return (
    <div className="prop-mini">
      <div className="prop-env">
        <span>{p.category}</span>
        {p.deadline && <span className="prop-deadline">{p.deadline}</span>}
        {p.approved && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>✓ Approuvé à {p.pct}%</span>}
      </div>
      <div className="prop-title">{p.title}</div>
      <div className="prop-desc">{p.desc}</div>
      <div className="vote-bar-wrap">
        <div className="vote-bar-bg"><div className="vote-bar-fill" style={{ width: `${p.pct}%`, background: barColor }} /></div>
        <span className="vote-pct" style={{ color: pctColor }}>{p.pct}%</span>
        {!p.approved && <span className="vote-pct-contra">{100 - p.pct}%</span>}
      </div>
      {!p.approved && (
        <div className="vote-btns">
          <button className={`vote-btn ${voted ? "voted-pour" : ""}`} onClick={() => setVotes({ ...votes, [p.id]: !voted })}>
            👍 Pour
          </button>
          <button className="vote-btn">👎 Contre</button>
        </div>
      )}
    </div>
  );
}

// ── MY REPORTS PAGE ────────────────────────────────────────────────────────
function MyReports({ setPage }: { setPage: (p: PageId) => void }) {
  const [activeTab, setActiveTab] = useState<"all" | "en-attente" | "en-cours" | "termine">("all");
  const filtered = activeTab === "all" ? REPORTS : REPORTS.filter(r => r.status === activeTab);
  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "all",        label: "Tous (3)"       },
    { id: "en-attente", label: "En attente (1)" },
    { id: "en-cours",   label: "En cours (1)"   },
    { id: "termine",    label: "Terminés (1)"   },
  ];
  return (
    <div className="my-reports-page fade-in">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ fontSize: 32 }}>Mes Signalements</div>
          <div className="section-sub">Suivez l'état d'avancement de vos demandes.</div>
        </div>
        <button className="btn-report" onClick={() => setPage("new-report")}>+ Nouveau signalement</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} className={`sidebar-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {filtered.map(r => (
        <div key={r.id} className="decl-card">
          <div className="decl-card-inner">
            <div className="decl-photo" style={{ background: r.bg }}>
              <span style={{ fontSize: 48 }}>{r.emoji}</span>
            </div>
            <div className="decl-body">
              <div className="decl-status-row">
                <StatusBadge status={r.status} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.ago}</span>
              </div>
              <div className="decl-title">{r.title}</div>
              <div className="decl-addr"><PinIcon />{r.addr}</div>
              <div className="decl-ref">{r.ref}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAP PAGE ───────────────────────────────────────────────────────────────
function MapPage() {
  const [activeTab, setActiveTab] = useState<"signalements" | "propositions">("signalements");
  const [activeFilters, setActiveFilters] = useState<string[]>(["Urgent"]);
  const toggleFilter = (f: string) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  return (
    <div className="map-layout">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-h1">Carte des Fixes</div>
          <div className="sidebar-tabs">
            {(["signalements","propositions"] as const).map(t => (
              <button key={t} className={`sidebar-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-search">
          <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
            <circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} />
          </svg>
          <input placeholder="Rechercher un signalement…" />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Statut <a>Tout effacer</a></div>
          <div className="filter-btns">
            {["Urgent","En cours","Résolu","En attente"].map(f => (
              <button key={f} className={`filter-btn ${activeFilters.includes(f) ? "active" : ""}`} onClick={() => toggleFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Catégories</div>
          <div className="cat-list">
            {[{ emoji:"🛣️", name:"Voirie", count:24 },{ emoji:"💡", name:"Éclairage", count:18 },{ emoji:"🌿", name:"Espaces Verts", count:15 }].map(c => (
              <div key={c.name} className="cat-item">
                <div className="cat-icon">{c.emoji}</div>
                <div className="cat-name">{c.name}</div>
                <div className="cat-count">{c.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="impact-widget">
          <div className="impact-label">📊 Impact Hebdo</div>
          <div className="impact-num">156</div>
          <div className="impact-desc">Signalements résolus cette semaine à Sousse.</div>
        </div>
      </div>

      {/* Map area */}
      <div className="map-area">
        <div className="map-controls">
          {["+","−","◎"].map(c => <div key={c} className="map-ctrl-btn">{c}</div>)}
        </div>

        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
          <path d="M0,300 Q200,280 400,300 Q600,320 800,300" stroke="rgba(255,255,255,0.5)" strokeWidth={3} fill="none"/>
          <path d="M0,200 Q200,190 400,200 Q600,210 800,200" stroke="rgba(255,255,255,0.3)" strokeWidth={2} fill="none"/>
          <path d="M400,0 Q420,200 400,400 Q380,500 400,600" stroke="rgba(255,255,255,0.4)" strokeWidth={2.5} fill="none"/>
          <circle cx={300} cy={220} r={12} fill="#FF6B2B" opacity=".9"/>
          <circle cx={300} cy={220} r={20} fill="#FF6B2B" opacity=".2"/>
          <circle cx={500} cy={350} r={11} fill="#FF6B2B" opacity=".85"/>
          <circle cx={420} cy={290} r={14} fill="#1557FF" opacity=".95"/>
          <circle cx={420} cy={290} r={24} fill="#1557FF" opacity=".2">
            <animate attributeName="r" from="14" to="28" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from=".3" to="0" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx={220} cy={380} r={11} fill="#0DB97A" opacity=".9"/>
          <circle cx={620} cy={180} r={11} fill="#0DB97A" opacity=".85"/>
          <circle cx={150} cy={260} r={10} fill="#0DB97A" opacity=".8"/>
        </svg>

        {/* Popup */}
        <div className="map-popup">
          <div className="popup-header">
            <div className="popup-tags">
              <span className="popup-urgent">Urgent</span>
              <span className="popup-time">Signalé il y a 2h</span>
            </div>
            <div className="popup-close">✕</div>
          </div>
          <div className="popup-body">
            <div className="popup-title">Nid-de-poule majeur</div>
            <div className="popup-addr">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx={12} cy={10} r={3}/></svg>
              Avenue Léopold Senghor, Sousse
            </div>
            <div className="popup-img">🕳️</div>
            <div className="popup-desc">Un nid-de-poule profond s'est formé suite aux dernières pluies. Risque important pour les deux-roues et dommages aux pneus.</div>
            <div className="popup-footer">
              <div className="popup-avatars">
                {["JD","MS","+12"].map(a => <div key={a} className="popup-avatar">{a}</div>)}
              </div>
              <button className="popup-support-btn">👍 Soutenir</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEW REPORT PAGE ────────────────────────────────────────────────────────
function NewReport({ setPage }: { setPage: (p: PageId) => void }) {
  const [selectedCat, setSelectedCat] = useState<number>(1);
  const [step, setStep] = useState<1|2|3>(1);

  return (
    <div className="report-page fade-in">
      <div className="report-hero">
        <div className="report-eyebrow">New Incident Report</div>
        <h1 className="report-title">Shape the future<br />of <span>Sousse.</span></h1>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:40, alignItems:"start" }}>
          <p className="report-note">Votre contribution nous aide à prioriser les réparations municipales et à maintenir le patrimoine architectural de notre ville.</p>
          <p style={{ fontSize:13, color:"var(--muted)", textAlign:"right", maxWidth:240, lineHeight:1.5 }}>Your contribution helps us prioritize municipal repairs and maintain our city's architectural heritage.</p>
        </div>
      </div>

      <div className="report-layout">
        {/* Steps nav */}
        <div className="report-steps">
          {[
            { n:1, name:"Select Category", hint:"Define the issue" },
            { n:2, name:"Pin Location",    hint:"Exact coordinates" },
            { n:3, name:"Details & Media", hint:"Visualize the problem" },
          ].map(s => (
            <div key={s.n} className={`step-item ${step === s.n ? "active" : step > s.n ? "done" : ""}`} onClick={() => setStep(s.n as 1|2|3)}>
              <div className="step-num">{step > s.n ? "✓" : s.n}</div>
              <div className="step-text">
                <div className="step-name">{s.name}</div>
                <div className="step-hint">{s.hint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div>
          {step === 1 && (
            <div className="report-form-section">
              <div className="form-section-title">What needs attention?</div>
              <div className="form-section-sub">Choose the category that best describes the municipal issue.</div>
              <div className="category-grid">
                {CATEGORIES.map((c, i) => (
                  <div key={c.name} className={`cat-card ${selectedCat === i ? "selected" : ""}`} onClick={() => setSelectedCat(i)}>
                    <div className="cat-card-icon" style={{ background: c.bg }}>{c.emoji}</div>
                    <div className="cat-card-name">{c.name}</div>
                    <div className="cat-card-desc">{c.desc}</div>
                  </div>
                ))}
              </div>
              <button className="btn-report" style={{ marginTop:24, width:"100%", justifyContent:"center", fontSize:15, padding:"14px 0" }} onClick={() => setStep(2)}>
                Continuer →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="report-form-section">
              <div className="form-section-title">Where is it located?</div>
              <div className="form-section-sub">Drag the pin to the exact location of the issue.</div>
              <div className="form-map">
                <svg style={{ width:"100%", height:"100%", opacity:.6 }} viewBox="0 0 700 280">
                  <path d="M0,140 Q175,120 350,140 Q525,160 700,140" stroke="rgba(10,22,40,0.2)" strokeWidth={2} fill="none"/>
                  <path d="M350,0 Q360,100 350,280" stroke="rgba(10,22,40,0.15)" strokeWidth={1.5} fill="none"/>
                  <path d="M175,0 Q180,100 175,280" stroke="rgba(10,22,40,0.1)" strokeWidth={1} fill="none"/>
                  <circle cx={350} cy={140} r={16} fill="#1557FF" opacity=".9"/>
                  <circle cx={350} cy={140} r={32} fill="#1557FF" opacity=".15"/>
                </svg>
                <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)" }}>
                  <span style={{ background:"white", padding:"6px 16px", borderRadius:99, fontSize:13, fontWeight:700, color:"var(--blue)", boxShadow:"var(--shadow-md)", border:"1px solid var(--border)" }}>📍 Avenue Habib Bourguiba, Sousse</span>
                </div>
              </div>
              <input style={{ width:"100%", marginTop:16, padding:"12px 16px", borderRadius:"var(--r-md)", border:"1.5px solid var(--border)", fontFamily:"inherit", fontSize:14, color:"var(--text)", outline:"none" }} placeholder="Ou entrez l'adresse manuellement…" />
              <div style={{ display:"flex", gap:12, marginTop:20 }}>
                <button className="btn-outline" onClick={() => setStep(1)}>← Retour</button>
                <button className="btn-report" style={{ flex:1, justifyContent:"center", fontSize:15, padding:"14px 0" }} onClick={() => setStep(3)}>Continuer →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="report-form-section">
              <div className="form-section-title">Details & Media</div>
              <div className="form-section-sub">Help us understand the issue with a description and photos.</div>
              <div className="form-field">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="Décrivez le problème en quelques mots…" defaultValue={`${CATEGORIES[selectedCat].name} — Issue`} />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={4} placeholder="Donnez plus de détails sur le problème, sa gravité, les risques…" />
              </div>
              <div className="form-field">
                <label className="form-label">Urgency</label>
                <div style={{ display:"flex", gap:10 }}>
                  {["Normal","Urgent","Critique"].map(u => (
                    <button key={u} className={`filter-btn ${u === "Urgent" ? "active" : ""}`}>{u}</button>
                  ))}
                </div>
              </div>
              <div className="upload-zone">
                <div style={{ fontSize:32, marginBottom:8 }}>📸</div>
                <div style={{ fontWeight:700, color:"var(--navy)", fontSize:15, marginBottom:4 }}>Ajouter des photos</div>
                <div style={{ fontSize:13, color:"var(--muted)" }}>Glissez vos fichiers ou cliquez pour parcourir</div>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:20 }}>
                <button className="btn-outline" onClick={() => setStep(2)}>← Retour</button>
                <button className="btn-report" style={{ flex:1, justifyContent:"center", fontSize:15, padding:"14px 0" }} onClick={() => setPage("my-reports")}>
                  🚀 Soumettre le signalement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PROPOSITIONS PAGE ──────────────────────────────────────────────────────
function PropositionsPage({ votes, setVotes }: { votes: Record<string, boolean>; setVotes: (v: Record<string, boolean>) => void }) {
  return (
    <div className="dashboard fade-in">
      <div className="section-header" style={{ marginBottom:32 }}>
        <div>
          <div className="section-title" style={{ fontSize:32 }}>Propositions du Maire</div>
          <div className="section-sub">Votez pour les projets qui façonnent l'avenir de Sousse.</div>
        </div>
      </div>
      <div style={{ display:"grid", gap:20, maxWidth:800 }}>
        {PROPOSITIONS.map(p => (
          <PropMini key={p.id} p={p} votes={votes} setVotes={setVotes} />
        ))}
      </div>
    </div>
  );
}

// ── CHATBOT ────────────────────────────────────────────────────────────────
function Chatbot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "Bonjour Sami ! 👋 Je suis Baladia, votre assistant municipal pour Sousse.<br><br>Comment puis-je vous aider aujourd'hui ?", role: "bot", time: "À l'instant" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, typing]);

  const send = useCallback((text: string) => {
    const msg = text.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { text: msg, role: "user", time: now() }]);
    setInput("");
    setShowQuick(false);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const key = Object.keys(BOT_REPLIES).find(k => msg.toLowerCase().includes(k)) || "default";
      setMessages(prev => [...prev, { text: BOT_REPLIES[key], role: "bot", time: now() }]);
    }, 1200);
  }, []);

  return (
    <div className={`chatbot-window ${open ? "open" : ""}`}>
      <div className="chat-header">
        <div className="chat-robot-avatar">
          <svg viewBox="0 0 32 32" fill="none" width={28} height={28}>
            <line x1={16} y1={2} x2={16} y2={7} stroke="white" strokeWidth={1.5}/>
            <circle cx={16} cy={1.5} r={1.5} fill="#5B9FFF"/>
            <rect x={7} y={7} width={18} height={13} rx={4} fill="white" fillOpacity=".9"/>
            <rect x={10} y={11} width={4} height={4} rx={1.5} fill="#1557FF"/>
            <rect x={18} y={11} width={4} height={4} rx={1.5} fill="#1557FF"/>
            <circle cx={11.5} cy={12.2} r={1} fill="white"/>
            <circle cx={19.5} cy={12.2} r={1} fill="white"/>
            <path d="M11 18 Q16 21 21 18" stroke="#1557FF" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
            <rect x={10} y={21} width={12} height={8} rx={3} fill="white" fillOpacity=".8"/>
            <rect x={13} y={22.5} width={6} height={5} rx={1.5} fill="#1557FF" fillOpacity=".6"/>
          </svg>
        </div>
        <div className="chat-header-text">
          <div className="chat-name">Baladia</div>
          <div className="chat-status">Assistant IA · Sousse</div>
        </div>
        <button className="chat-close" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="bubble-inner" dangerouslySetInnerHTML={{ __html: m.text }} />
            <div className="bubble-time">{m.time}</div>
          </div>
        ))}
        {typing && (
          <div className="chat-typing">
            <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
          </div>
        )}
      </div>

      {showQuick && (
        <div className="quick-replies">
          {["Suivre mon signalement","Comment signaler ?","Statut de ma demande"].map(q => (
            <button key={q} className="quick-reply" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      <div className="chat-input-bar">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send(input)}
          placeholder="Posez votre question…"
        />
        <button className="chat-send" onClick={() => send(input)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}>
            <line x1={22} y1={2} x2={11} y2={13}/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── CHATBOT FAB ────────────────────────────────────────────────────────────
function ChatFab({ onClick, showBadge }: { onClick: () => void; showBadge: boolean }) {
  return (
    <button className="chatbot-fab" onClick={onClick} aria-label="Open chat">
      <svg viewBox="0 0 40 40" fill="none" width={36} height={36}>
        <line x1={20} y1={4} x2={20} y2={9} stroke="white" strokeWidth={1.8} strokeLinecap="round"/>
        <circle cx={20} cy={3} r={2} fill="#5B9FFF"/>
        <rect x={9} y={9} width={22} height={16} rx={5} fill="white" fillOpacity=".95"/>
        <rect x={13} y={14} width={5} height={5} rx={2} fill="#1557FF"/>
        <rect x={22} y={14} width={5} height={5} rx={2} fill="#1557FF"/>
        <circle cx={15} cy={15.5} r={1.2} fill="white"/>
        <circle cx={24} cy={15.5} r={1.2} fill="white"/>
        <path d="M14 22 Q20 25 26 22" stroke="#1557FF" strokeWidth={1.5} strokeLinecap="round" fill="none"/>
        <rect x={12} y={26} width={16} height={11} rx={4} fill="white" fillOpacity=".85"/>
        <rect x={16} y={28.5} width={8} height={6} rx={2} fill="#1557FF" fillOpacity=".7"/>
        <circle cx={20} cy={31.5} r={1.5} fill="white"/>
        <rect x={5} y={27} width={6} height={9} rx={3} fill="white" fillOpacity=".75"/>
        <rect x={29} y={27} width={6} height={9} rx={3} fill="white" fillOpacity=".75"/>
      </svg>
      {showBadge && <div className="chatbot-fab-badge" />}
    </button>
  );
}

// ── ROOT COMPONENT ─────────────────────────────────────────────────────────
export default function FixMaCity() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [votes, setVotes] = useState<Record<string, boolean>>({});

  const handleChatToggle = () => {
    setChatOpen(o => !o);
    setShowBadge(false);
  };

  const handleSetPage = (p: PageId) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#0A1628;--blue:#1557FF;--blue-hover:#1248D6;--blue-soft:#EBF2FF;
          --blue-mid:rgba(21,87,255,0.12);--white:#fff;--bg:#F4F7FC;--surface:#fff;
          --border:#DDE6F5;--text:#0A1628;--muted:#607090;--light:#94A8C4;
          --green:#0DB97A;--green-soft:#E8FAF3;--orange:#FF6B2B;--orange-soft:#FFF0E8;
          --red:#EF4444;--red-soft:#FEF2F2;--yellow:#F59E0B;
          --shadow-sm:0 1px 4px rgba(10,22,40,0.07);
          --shadow-md:0 4px 18px rgba(10,22,40,0.10);
          --shadow-lg:0 10px 40px rgba(10,22,40,0.14);
          --shadow-blue:0 6px 22px rgba(21,87,255,0.32);
          --r-sm:8px;--r-md:12px;--r-lg:16px;--r-xl:24px;
        }
        html{scroll-behavior:smooth}
        body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);background:var(--bg);overflow-x:hidden}
        h1,h2,h3,h4,h5{font-family:'Outfit',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}

        /* NAVBAR */
        .navbar{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:64px;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);box-shadow:0 1px 12px rgba(10,22,40,0.05)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;background:none;border:none;cursor:pointer}
        .nav-logo-icon{width:36px;height:36px;background:var(--navy);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .nav-logo-text{font-family:'Outfit',sans-serif;font-weight:800;font-size:18px;color:var(--navy);letter-spacing:-0.3px}
        .nav-logo-text span{color:var(--blue)}
        .nav-links{display:flex;gap:4px}
        .nav-link{padding:8px 16px;border-radius:var(--r-md);font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;border:none;background:none;cursor:pointer;transition:color .2s,background .2s;font-family:'Plus Jakarta Sans',sans-serif}
        .nav-link:hover{color:var(--navy);background:var(--bg)}
        .nav-link.active{color:var(--blue);font-weight:700;background:var(--blue-soft)}
        .nav-right{display:flex;align-items:center;gap:12px}
        .nav-bell{position:relative;width:40px;height:40px;border-radius:50%;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s}
        .nav-bell:hover{background:var(--blue-soft)}
        .bell-badge{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--red);border:2px solid white}
        .nav-avatar{width:38px;height:38px;border-radius:50%;background:var(--navy);display:flex;align-items:center;justify-content:center;color:white;font-family:'Outfit',sans-serif;font-weight:800;font-size:14px;cursor:pointer;border:2px solid var(--blue-soft)}
        .btn-report{display:flex;align-items:center;gap:8px;background:var(--blue);color:white;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;padding:9px 18px;border-radius:var(--r-md);border:none;cursor:pointer;text-decoration:none;box-shadow:var(--shadow-blue);transition:transform .15s,box-shadow .15s,background .15s}
        .btn-report:hover{background:var(--blue-hover);transform:translateY(-1px);box-shadow:0 8px 28px rgba(21,87,255,.4)}
        .btn-outline{display:flex;align-items:center;gap:8px;background:white;color:var(--navy);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;padding:12px 20px;border-radius:var(--r-md);border:1.5px solid var(--border);cursor:pointer;transition:border-color .2s,background .2s}
        .btn-outline:hover{border-color:var(--blue);background:var(--blue-soft)}

        /* PAGE */
        .page-wrap{padding-top:64px;min-height:100vh}

        /* DASHBOARD */
        .dashboard{padding:32px}
        .greeting-card{background:linear-gradient(135deg,var(--navy) 0%,#162B4A 100%);border-radius:var(--r-xl);padding:36px 40px;margin-bottom:24px;position:relative;overflow:hidden}
        .greeting-card-bg1{position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(21,87,255,.3),transparent 70%)}
        .greeting-card-bg2{position:absolute;bottom:-40px;left:40%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(21,87,255,.15),transparent 70%)}
        .greeting-grid{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
        .greeting-subtitle{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px}
        .greeting-title{font-family:'Outfit',sans-serif;font-size:42px;font-weight:900;color:white;letter-spacing:-1px;line-height:1.1}
        .greeting-title em{color:#7EC8FF;font-style:italic}
        .greeting-tagline{font-size:15px;color:rgba(255,255,255,.55);margin-top:8px}
        .greeting-stats{display:flex;gap:16px;position:relative;z-index:1}
        .g-stat{background:rgba(255,255,255,.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1);border-radius:var(--r-lg);padding:18px 22px;min-width:120px;text-align:center}
        .g-stat-num{font-family:'Outfit',sans-serif;font-size:32px;font-weight:900;color:white}
        .g-stat-label{font-size:11px;color:rgba(255,255,255,.45);font-weight:600;letter-spacing:.8px;text-transform:uppercase;margin-top:4px}

        /* KPI */
        .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
        .kpi-card{background:white;border-radius:var(--r-lg);padding:20px 24px;border:1px solid var(--border);box-shadow:var(--shadow-sm);display:flex;align-items:center;justify-content:space-between;transition:transform .2s,box-shadow .2s}
        .kpi-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
        .kpi-label{font-size:11px;font-weight:700;color:var(--light);letter-spacing:1px;text-transform:uppercase}
        .kpi-value{font-family:'Outfit',sans-serif;font-size:36px;font-weight:900;color:var(--navy);line-height:1.1;margin-top:4px}
        .kpi-icon{width:48px;height:48px;border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:22px}

        /* SECTION HEADER */
        .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .section-title{font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:var(--navy)}
        .section-sub{font-size:13px;color:var(--muted);margin-top:3px}
        .link-all{font-size:14px;font-weight:700;color:var(--blue);text-decoration:none;display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer}
        .link-all:hover{text-decoration:underline}

        /* DECL CARD */
        .decl-card{background:white;border-radius:var(--r-xl);border:1px solid var(--border);box-shadow:var(--shadow-sm);overflow:hidden;margin-bottom:16px;transition:box-shadow .2s}
        .decl-card:hover{box-shadow:var(--shadow-md)}
        .decl-card-inner{display:grid;grid-template-columns:240px 1fr}
        .decl-photo{height:200px;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(135deg,#1B3A6B,#0A1F42)}
        .decl-photo-overlay{position:absolute;bottom:12px;left:12px;display:flex;gap:6px;flex-wrap:wrap}
        .tag{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:4px 10px;border-radius:99px}
        .tag-urgent{background:rgba(239,68,68,.9);color:white}
        .tag-infra{background:rgba(21,87,255,.85);color:white}
        .decl-body{padding:24px 28px}
        .decl-status-row{display:flex;align-items:center;gap:10px;margin-bottom:14px}
        .status-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:5px 12px;border-radius:99px}
        .status-en-attente{background:var(--orange-soft);color:var(--orange)}
        .status-en-cours{background:var(--blue-soft);color:var(--blue)}
        .status-termine{background:var(--green-soft);color:var(--green)}
        .status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block}
        .dot-orange{background:var(--orange)}
        .dot-blue{background:var(--blue);animation:pulse-status 1.5s infinite}
        .dot-green{background:var(--green)}
        @keyframes pulse-status{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.4)}}
        .decl-title{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:var(--navy);margin-bottom:8px}
        .decl-addr{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;margin-bottom:20px}
        .decl-ref{font-family:'Courier New',monospace;font-size:11px;color:var(--light);margin-top:14px;background:var(--bg);display:inline-block;padding:3px 8px;border-radius:4px;border:1px solid var(--border)}

        /* STEPPER */
        .stepper{display:flex;align-items:center;margin-bottom:8px}
        .step-node{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px}
        .step-done{background:var(--navy);color:white}
        .step-active{background:var(--blue);color:white;box-shadow:0 0 0 4px rgba(21,87,255,.2)}
        .step-upcoming{background:white;border:2px solid var(--border);color:var(--light)}
        .step-line{flex:1;height:2px}
        .step-line-done{background:var(--navy)}
        .step-line-upcoming{background:var(--border)}
        .step-label-row{display:flex;justify-content:space-between;margin-top:4px}
        .step-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;text-align:center;width:32px}
        .step-label-done{color:var(--navy)}
        .step-label-active{color:var(--blue)}
        .step-label-upcoming{color:var(--light)}

        /* UPDATE */
        .decl-update{background:var(--bg);border-radius:var(--r-lg);padding:14px 18px;display:flex;align-items:flex-start;gap:12px}
        .update-avatar{width:36px;height:36px;border-radius:50%;background:var(--blue-soft);display:flex;align-items:center;justify-content:center;color:var(--blue);font-size:16px;flex-shrink:0}
        .update-meta{font-size:12px;color:var(--muted);margin-bottom:4px}
        .update-text{font-size:13px;color:var(--text);line-height:1.5}
        .update-text em{color:var(--blue);font-style:normal;font-weight:700}

        /* BOTTOM GRID */
        .bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px}

        /* PROP MINI */
        .prop-mini{background:white;border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;margin-bottom:14px;box-shadow:var(--shadow-sm);transition:box-shadow .2s}
        .prop-mini:hover{box-shadow:var(--shadow-md)}
        .prop-env{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
        .prop-deadline{font-size:11px;font-weight:600;color:var(--orange)}
        .prop-title{font-family:'Outfit',sans-serif;font-size:17px;font-weight:800;color:var(--navy);margin-bottom:8px}
        .prop-desc{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:16px}
        .vote-bar-wrap{display:flex;align-items:center;gap:8px;margin-bottom:12px}
        .vote-bar-bg{flex:1;height:5px;background:var(--border);border-radius:99px;overflow:hidden}
        .vote-bar-fill{height:100%;background:var(--blue);border-radius:99px;transition:width .5s ease}
        .vote-pct{font-size:11px;font-weight:800;color:var(--blue)}
        .vote-pct-contra{font-size:11px;font-weight:600;color:var(--muted)}
        .vote-btns{display:flex;gap:10px}
        .vote-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border-radius:var(--r-md);font-size:13px;font-weight:700;border:1.5px solid var(--border);background:white;cursor:pointer;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif}
        .vote-btn:hover{border-color:var(--blue);background:var(--blue-soft);color:var(--blue)}
        .voted-pour{background:var(--blue)!important;border-color:var(--blue)!important;color:white!important}

        /* ACHIEVEMENTS */
        .recent-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .achieve-card{border-radius:var(--r-lg);overflow:hidden;position:relative;cursor:pointer}
        .achieve-img{height:100px;display:flex;align-items:center;justify-content:center;font-size:32px}
        .achieve-info{padding:12px;background:white;border:1px solid var(--border);border-top:none}
        .achieve-badge{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--green);margin-bottom:4px}
        .achieve-title{font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:var(--navy)}
        .achieve-date{font-size:11px;color:var(--muted);margin-top:2px}

        /* MAP INSIGHT */
        .map-insight{background:var(--blue);border-radius:var(--r-lg);padding:24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}
        .map-insight-label{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5)}
        .map-insight-text{font-size:14px;color:rgba(255,255,255,.8);line-height:1.5}
        .map-btn{background:white;color:var(--blue);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:800;padding:11px 22px;border-radius:var(--r-md);border:none;cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:var(--shadow-md)}
        .map-btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-lg)}

        /* MAP PAGE */
        .map-layout{display:flex;height:calc(100vh - 64px)}
        .map-sidebar{width:340px;flex-shrink:0;background:white;border-right:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column}
        .sidebar-header{padding:20px 24px;border-bottom:1px solid var(--border)}
        .sidebar-h1{font-family:'Outfit',sans-serif;font-size:22px;font-weight:900;color:var(--navy);margin-bottom:12px}
        .sidebar-tabs{display:flex;gap:6px}
        .sidebar-tab{padding:7px 16px;border-radius:99px;font-size:12px;font-weight:700;border:1.5px solid var(--border);background:white;cursor:pointer;color:var(--muted);transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif}
        .sidebar-tab.active{background:var(--navy);border-color:var(--navy);color:white}
        .sidebar-search{position:relative;padding:16px 20px;border-bottom:1px solid var(--border)}
        .sidebar-search input{width:100%;padding:10px 14px 10px 40px;border-radius:var(--r-md);border:1.5px solid var(--border);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:var(--text);background:var(--bg);outline:none;transition:border-color .2s}
        .sidebar-search input:focus{border-color:var(--blue);background:white}
        .sidebar-search-icon{position:absolute;left:32px;top:50%;transform:translateY(-50%);color:var(--light)}
        .sidebar-section{padding:16px 20px;border-bottom:1px solid var(--border)}
        .sidebar-label{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--light);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
        .sidebar-label a{font-size:11px;color:var(--blue);font-weight:700;cursor:pointer}
        .filter-btns{display:flex;gap:8px;flex-wrap:wrap}
        .filter-btn{padding:7px 16px;border-radius:99px;font-size:12px;font-weight:700;border:1.5px solid var(--border);background:white;cursor:pointer;color:var(--muted);transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif}
        .filter-btn.active{background:var(--blue);border-color:var(--blue);color:white}
        .cat-list{display:flex;flex-direction:column;gap:8px}
        .cat-item{display:flex;align-items:center;padding:12px 14px;border-radius:var(--r-md);border:1.5px solid var(--border);background:white;cursor:pointer;transition:border-color .2s,background .2s}
        .cat-item:hover{border-color:var(--blue);background:var(--blue-soft)}
        .cat-icon{width:32px;height:32px;border-radius:var(--r-sm);background:var(--blue-soft);display:flex;align-items:center;justify-content:center;font-size:16px;margin-right:10px;flex-shrink:0}
        .cat-name{font-size:14px;font-weight:600;color:var(--navy);flex:1}
        .cat-count{width:24px;height:24px;border-radius:50%;background:var(--blue);color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
        .impact-widget{margin:20px;border-radius:var(--r-lg);background:var(--blue-soft);padding:20px;border:1px solid rgba(21,87,255,.15)}
        .impact-label{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--blue);margin-bottom:8px;display:flex;align-items:center;gap:8px}
        .impact-num{font-family:'Outfit',sans-serif;font-size:42px;font-weight:900;color:var(--navy);line-height:1}
        .impact-desc{font-size:13px;color:var(--muted);margin-top:4px}
        .map-area{flex:1;position:relative;background:linear-gradient(160deg,#B8D4E8 0%,#A0C4D8 30%,#80B0C8 60%,#6AABB8 100%);display:flex;align-items:center;justify-content:center}
        .map-controls{position:absolute;top:20px;right:20px;display:flex;flex-direction:column;gap:8px}
        .map-ctrl-btn{width:36px;height:36px;border-radius:var(--r-md);background:white;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:var(--shadow-sm);font-weight:700;color:var(--navy);transition:background .2s}
        .map-ctrl-btn:hover{background:var(--blue-soft)}

        /* MAP POPUP */
        .map-popup{position:absolute;top:20px;left:20px;width:280px;background:white;border-radius:var(--r-xl);box-shadow:var(--shadow-lg);overflow:hidden;border:1px solid var(--border)}
        .popup-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)}
        .popup-tags{display:flex;align-items:center;gap:8px}
        .popup-urgent{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:3px 9px;border-radius:99px;background:rgba(239,68,68,.1);color:var(--red)}
        .popup-time{font-size:11px;color:var(--muted);font-weight:500}
        .popup-close{font-size:14px;color:var(--light);cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--bg)}
        .popup-body{padding:16px}
        .popup-title{font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:var(--navy);margin-bottom:6px}
        .popup-addr{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;margin-bottom:12px}
        .popup-img{height:80px;background:linear-gradient(135deg,#2D1B1B,#4A2D1A);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:12px}
        .popup-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px}
        .popup-footer{display:flex;align-items:center;justify-content:space-between}
        .popup-avatars{display:flex}
        .popup-avatar{width:24px;height:24px;border-radius:50%;background:var(--navy);color:white;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid white;margin-left:-6px}
        .popup-avatar:first-child{margin-left:0}
        .popup-support-btn{padding:7px 14px;border-radius:var(--r-md);background:var(--blue-soft);color:var(--blue);font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif}
        .popup-support-btn:hover{background:var(--blue);color:white}

        /* MY REPORTS */
        .my-reports-page{padding:32px;max-width:900px;margin:0 auto}

        /* NEW REPORT */
        .report-page{max-width:1000px;margin:0 auto}
        .report-hero{background:linear-gradient(135deg,var(--navy),#1A3A6B);padding:48px 48px 40px;position:relative;overflow:hidden}
        .report-hero::before{content:'';position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(21,87,255,.3),transparent 70%)}
        .report-eyebrow{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:12px}
        .report-title{font-family:'Outfit',sans-serif;font-size:48px;font-weight:900;color:white;letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px}
        .report-title span{color:#7EC8FF}
        .report-note{font-size:15px;color:rgba(255,255,255,.6);line-height:1.6;max-width:420px}
        .report-layout{display:grid;grid-template-columns:200px 1fr;gap:0}
        .report-steps{background:var(--bg);padding:32px 24px;border-right:1px solid var(--border);display:flex;flex-direction:column;gap:4px}
        .step-item{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--r-md);cursor:pointer;transition:background .2s}
        .step-item:hover{background:white}
        .step-item.active{background:white;box-shadow:var(--shadow-sm)}
        .step-num{width:32px;height:32px;border-radius:50%;background:var(--border);color:var(--muted);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Outfit',sans-serif}
        .step-item.active .step-num{background:var(--blue);color:white}
        .step-item.done .step-num{background:var(--navy);color:white}
        .step-name{font-size:13px;font-weight:700;color:var(--navy)}
        .step-hint{font-size:11px;color:var(--muted);margin-top:2px}
        .report-form-section{background:white;padding:32px 36px;min-height:calc(100vh - 64px - 200px)}
        .form-section-title{font-family:'Outfit',sans-serif;font-size:24px;font-weight:800;color:var(--navy);margin-bottom:6px}
        .form-section-sub{font-size:14px;color:var(--muted);margin-bottom:24px}
        .category-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .cat-card{border:2px solid var(--border);border-radius:var(--r-lg);padding:18px 14px;cursor:pointer;transition:all .2s;background:white}
        .cat-card:hover{border-color:var(--blue);background:var(--blue-soft)}
        .cat-card.selected{border-color:var(--blue);background:var(--blue-soft)}
        .cat-card-icon{width:44px;height:44px;border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:10px}
        .cat-card-name{font-family:'Outfit',sans-serif;font-size:15px;font-weight:800;color:var(--navy);margin-bottom:4px}
        .cat-card-desc{font-size:11px;color:var(--muted)}
        .form-map{height:220px;border-radius:var(--r-lg);background:linear-gradient(160deg,#B8D4E8,#A0C4D8);border:1px solid var(--border);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .form-field{margin-bottom:20px}
        .form-label{font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:8px}
        .form-input{width:100%;padding:12px 16px;border-radius:var(--r-md);border:1.5px solid var(--border);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;color:var(--text);outline:none;transition:border-color .2s}
        .form-input:focus{border-color:var(--blue)}
        .form-textarea{width:100%;padding:12px 16px;border-radius:var(--r-md);border:1.5px solid var(--border);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;color:var(--text);outline:none;resize:vertical;transition:border-color .2s}
        .form-textarea:focus{border-color:var(--blue)}
        .upload-zone{border:2px dashed var(--border);border-radius:var(--r-lg);padding:32px;display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;transition:border-color .2s,background .2s}
        .upload-zone:hover{border-color:var(--blue);background:var(--blue-soft)}

        /* CHATBOT */
        .chatbot-fab{position:fixed;bottom:28px;right:28px;z-index:300;width:64px;height:64px;border-radius:50%;background:var(--navy);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(10,22,40,.25);transition:transform .2s,box-shadow .2s}
        .chatbot-fab:hover{transform:scale(1.08);box-shadow:0 12px 40px rgba(10,22,40,.3)}
        .chatbot-fab-badge{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:var(--red);border:2px solid white;animation:bounce .8s ease infinite}
        @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
        .chatbot-window{position:fixed;bottom:106px;right:28px;z-index:299;width:360px;background:white;border-radius:var(--r-xl);box-shadow:var(--shadow-lg);border:1px solid var(--border);display:flex;flex-direction:column;max-height:520px;opacity:0;transform:translateY(20px) scale(.95);pointer-events:none;transition:opacity .2s,transform .2s}
        .chatbot-window.open{opacity:1;transform:none;pointer-events:all}
        .chat-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;background:var(--navy);border-radius:var(--r-xl) var(--r-xl) 0 0}
        .chat-robot-avatar{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .chat-header-text{flex:1}
        .chat-name{font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:white}
        .chat-status{font-size:11px;color:rgba(255,255,255,.5);margin-top:2px}
        .chat-close{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);font-size:14px;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
        .chat-close:hover{background:rgba(255,255,255,.2)}
        .chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
        .chat-bubble{display:flex;flex-direction:column;max-width:85%}
        .chat-bubble.bot{align-self:flex-start}
        .chat-bubble.user{align-self:flex-end;align-items:flex-end}
        .bubble-inner{padding:10px 14px;border-radius:var(--r-lg);font-size:13px;line-height:1.5}
        .chat-bubble.bot .bubble-inner{background:var(--bg);color:var(--text);border-radius:4px var(--r-lg) var(--r-lg) var(--r-lg)}
        .chat-bubble.user .bubble-inner{background:var(--blue);color:white;border-radius:var(--r-lg) 4px var(--r-lg) var(--r-lg)}
        .bubble-time{font-size:10px;color:var(--light);margin-top:4px;font-weight:500}
        .chat-typing{display:flex;gap:5px;padding:12px 14px;background:var(--bg);border-radius:4px var(--r-lg) var(--r-lg) var(--r-lg);align-self:flex-start}
        .typing-dot{width:7px;height:7px;border-radius:50%;background:var(--light);animation:typing .9s infinite}
        .typing-dot:nth-child(2){animation-delay:.2s}
        .typing-dot:nth-child(3){animation-delay:.4s}
        @keyframes typing{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .quick-replies{padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--border)}
        .quick-reply{padding:7px 14px;border-radius:99px;border:1.5px solid var(--border);background:white;font-size:12px;font-weight:600;color:var(--navy);cursor:pointer;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif}
        .quick-reply:hover{border-color:var(--blue);background:var(--blue-soft);color:var(--blue)}
        .chat-input-bar{padding:12px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px}
        .chat-input{flex:1;padding:10px 14px;border-radius:var(--r-lg);border:1.5px solid var(--border);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:var(--text);outline:none;transition:border-color .2s}
        .chat-input:focus{border-color:var(--blue)}
        .chat-send{width:40px;height:40px;border-radius:50%;background:var(--blue);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-blue);transition:transform .15s}
        .chat-send:hover{transform:scale(1.08)}

        /* ANIMATIONS */
        .fade-in{animation:fade-in-up .5s ease both}
        @keyframes fade-in-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        @media(max-width:768px){
          .navbar{padding:0 16px}
          .nav-links{display:none}
          .dashboard{padding:16px}
          .greeting-grid{flex-direction:column;gap:20px}
          .greeting-stats{flex-wrap:wrap}
          .kpi-row{grid-template-columns:1fr}
          .decl-card-inner{grid-template-columns:1fr}
          .decl-photo{height:160px}
          .bottom-grid{grid-template-columns:1fr}
          .map-layout{flex-direction:column}
          .map-sidebar{width:100%;height:auto}
          .report-layout{grid-template-columns:1fr}
          .report-steps{display:none}
          .category-grid{grid-template-columns:repeat(2,1fr)}
          .chatbot-window{width:calc(100vw - 32px);right:16px}
        }
      `}</style>

      <Navbar activePage={page} setPage={handleSetPage} onChatToggle={handleChatToggle} />

      <div className="page-wrap">
        {page === "dashboard"    && <Dashboard setPage={handleSetPage} votes={votes} setVotes={setVotes} />}
        {page === "my-reports"   && <MyReports setPage={handleSetPage} />}
        {page === "map"          && <MapPage />}
        {page === "new-report"   && <NewReport setPage={handleSetPage} />}
        {page === "propositions" && <PropositionsPage votes={votes} setVotes={setVotes} />}
      </div>

      <ChatFab onClick={handleChatToggle} showBadge={showBadge} />
      <Chatbot open={chatOpen} onClose={handleChatToggle} />
    </>
  );
}
