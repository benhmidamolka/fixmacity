import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, Kanban, LayoutDashboard, Bell, LogOut, Menu, ChevronRight, Shield } from "lucide-react";

const navItems = [
  { to: "/agent/dashboard",     icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/agent/declarations",  icon: ClipboardList,   label: "Mes Missions"    },
  { to: "/agent/board",         icon: Kanban,          label: "Tableau Kanban"  },
];

export default function AgentLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}');
  const fullName = user.first_name ? `${user.first_name} ${user.last_name}` : 'Agent Terrain';
  const initials = `${(user.first_name || 'A')[0]}${(user.last_name || 'T')[0]}`.toUpperCase();
  const dept = user.department_name || user.service || 'Voirie & Routes';

  const logout = () => {
    localStorage.removeItem('fmc_token');
    localStorage.removeItem('fmc_user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">FixMaCity</p>
            <p className="text-xs text-emerald-600 font-medium">Agent Terrain</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon size={18} className={active ? 'text-emerald-600' : 'text-gray-400'} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto text-emerald-500" />}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{fullName}</p>
              <p className="text-xs text-gray-400 truncate">{dept}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}