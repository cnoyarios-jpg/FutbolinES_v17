import { motion } from 'framer-motion';
import { MapPin, Trophy, BarChart3, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MOCK_TOURNAMENTS, MOCK_VENUES, MOCK_TABLES } from '@/data/mock';
import TournamentCard from '@/components/TournamentCard';
import VenueCard from '@/components/VenueCard';

export default function HomePage() {
  const upcomingTournaments = MOCK_TOURNAMENTS.filter(t => t.status === 'abierto').slice(0, 2);
  const featuredVenues = MOCK_VENUES.filter(v => v.status === 'activo').slice(0, 3);

  return (
    <div className="min-h-screen pb-20">
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-hero px-5 pb-12 pt-16 text-center relative overflow-hidden">
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="relative">
          <h1 className="font-display text-5xl font-bold tracking-tight text-primary-foreground">
            Futbolín<span className="text-accent">ES</span>
          </h1>
          <p className="mt-3 text-base font-medium text-primary-foreground/85">Todo el futbolín español en una app</p>
          <p className="mt-1.5 text-sm text-primary-foreground/50">Mapa · Torneos · Ranking · Comunidad</p>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.5 }} className="mt-10 grid grid-cols-4 gap-3 relative">
          {[
            { icon: MapPin, label: 'Bares', path: '/futbolines' },
            { icon: Trophy, label: 'Torneos', path: '/torneos' },
            { icon: BarChart3, label: 'Ranking', path: '/ranking' },
            { icon: Users, label: 'Equipos', path: '/equipos' },
          ].map(({ icon: Icon, label, path }) => (
            <Link key={path} to={path} className="flex flex-col items-center gap-2 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm py-4 text-primary-foreground transition-all active:scale-95 hover:bg-primary-foreground/15 hover:shadow-glow">
              <Icon className="h-6 w-6" />
              <span className="text-[11px] font-bold tracking-wide">{label}</span>
            </Link>
          ))}
        </motion.div>
      </motion.section>

      <div className="px-5 pt-6 space-y-7">
        {upcomingTournaments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold">Próximos torneos</h2>
              <Link to="/torneos" className="flex items-center gap-0.5 text-xs font-bold text-primary hover:text-primary/80 transition">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {upcomingTournaments.map(t => (
                <Link key={t.id} to={`/torneos/${t.id}`}>
                  <TournamentCard tournament={t} />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold">Futbolines cerca</h2>
            <Link to="/mapa" className="flex items-center gap-0.5 text-xs font-bold text-primary hover:text-primary/80 transition">
              Ver mapa <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {featuredVenues.map(v => (
              <Link key={v.id} to={`/locales/${v.id}`}>
                <VenueCard venue={v} table={MOCK_TABLES.find(t => t.venueId === v.id)} compact />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
