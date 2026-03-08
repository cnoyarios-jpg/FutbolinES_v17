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
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-hero px-5 pb-8 pt-12 text-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary-foreground">
            Futbolín<span className="text-accent">ES</span>
          </h1>
          <p className="mt-3 text-base font-medium text-primary-foreground/90">Todo el futbolín español en una app</p>
          <p className="mt-1 text-sm text-primary-foreground/70">Mapa · Torneos · Ranking · Comunidad</p>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6 grid grid-cols-4 gap-2">
          {[
            { icon: MapPin, label: 'Bares', path: '/futbolines', color: 'bg-primary-foreground/20' },
            { icon: Trophy, label: 'Torneos', path: '/torneos', color: 'bg-primary-foreground/20' },
            { icon: BarChart3, label: 'Ranking', path: '/ranking', color: 'bg-primary-foreground/20' },
            { icon: Users, label: 'Equipos', path: '/equipos', color: 'bg-primary-foreground/20' },
          ].map(({ icon: Icon, label, path, color }) => (
            <Link key={path} to={path} className={`flex flex-col items-center gap-1 rounded-xl ${color} py-3 text-primary-foreground transition active:scale-95`}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          ))}
        </motion.div>
      </motion.section>

      <div className="px-4 pt-6">
        {upcomingTournaments.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold">Próximos torneos</h2>
              <Link to="/torneos" className="flex items-center gap-0.5 text-xs font-semibold text-primary">
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

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold">Futbolines cerca</h2>
            <Link to="/mapa" className="flex items-center gap-0.5 text-xs font-semibold text-primary">
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
