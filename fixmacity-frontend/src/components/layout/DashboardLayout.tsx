import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

/* SVG icon helper */
const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const citizenSections = [
  {
    title: 'Navigation',
    items: [
      { label: 'Tableau de Bord', path: '/dashboard', icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" /> },
      { label: 'Mes Signalements', path: '/dashboard/reports', icon: <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" /> },
      { label: 'Nouveau Signalement', path: '/dashboard/new-report', icon: <Icon d="M12 5v14 M5 12h14" /> },
    ]
  },
  {
    title: 'Communauté',
    items: [
      { label: 'Propositions', path: '/dashboard/propositions', icon: <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
      { label: 'Carte Interactive', path: '/dashboard/map', icon: <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /> },
    ]
  },
  {
    title: 'Compte',
    items: [
      { label: 'Notifications', path: '/dashboard/notifications', icon: <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" /> },
      { label: 'Mon Profil', path: '/dashboard/profile', icon: <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /> },
    ]
  }
];

export default function DashboardLayout() {
  return (
    <>
      <Navbar isAuthenticated userName="Ahmed" />
      <div className="dashboard-layout">
        <Sidebar sections={citizenSections} />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
