import { Link, useLocation } from 'react-router-dom';
import { MapPin, Trophy, BarChart3, User, Home } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/futbolines', icon: MapPin, label: 'Bares' },
  { path: '/torneos', icon: Trophy, label: 'Torneos' },
  { path: '/ranking', icon: BarChart3, label: 'Ranking' },
  { path: '/perfil', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute -top-0 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
