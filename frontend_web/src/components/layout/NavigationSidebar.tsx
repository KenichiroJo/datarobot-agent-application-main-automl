import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ホーム' },
  { to: '/content', icon: FileText, label: '予測コンテンツ' },
  { to: '/insights', icon: BarChart3, label: 'モデルインサイト' },
];

export function NavigationSidebar() {
  return (
    <aside className="w-16 min-h-screen bg-card border-r border-border flex flex-col items-center py-4 gap-1">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm mb-6">
        PA
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`
          }
        >
          <item.icon size={20} />
          <span className="text-[9px] leading-tight">{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
