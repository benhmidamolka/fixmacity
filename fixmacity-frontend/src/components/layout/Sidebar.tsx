import { Link, useLocation } from 'react-router-dom';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[];
}

export default function Sidebar({ sections }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      {sections.map((section, si) => (
        <div key={si}>
          <div className="sidebar-section-label">{section.title}</div>
          {section.items.map((item, ii) => (
            <Link
              key={ii}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
