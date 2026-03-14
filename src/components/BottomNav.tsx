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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/90 backdrop-blur-2xl safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-[10px] font-semibold transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`rounded-xl p-1.5 transition-all duration-200 ${isActive ? 'bg-primary/12 shadow-glow scale-110' : ''}`}>
                <Icon className={`h-5 w-5 transition-all ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="tracking-wide">{label}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
