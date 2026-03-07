import PageShell from '@/components/PageShell';
import { MOCK_TEAMS } from '@/data/mock';
import { MapPin, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeamsPage() {
  return (
    <PageShell title="Equipos">
      <div className="flex flex-col gap-3">
        {MOCK_TEAMS.map((team, i) => (
          <div key={team.id} className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-card">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : i === 1 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold truncate">{team.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><MapPin className="h-3 w-3" />{team.city}</div>
              {team.description && <p className="text-xs text-muted-foreground mt-1 truncate">{team.description}</p>}
            </div>
            <div className="text-right"><p className="font-display text-xl font-bold text-primary">{team.elo}</p><p className="text-[10px] text-muted-foreground">ELO</p></div>
          </div>
        ))}
      </div>
      <Link to="/equipos/crear" className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-elevated text-secondary-foreground transition hover:opacity-90 active:scale-90">
        <Plus className="h-6 w-6" />
      </Link>
    </PageShell>
  );
}
