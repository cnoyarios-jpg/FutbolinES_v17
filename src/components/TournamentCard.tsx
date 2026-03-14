import { Tournament } from '@/types';
import { Calendar, MapPin, Users } from 'lucide-react';
import { getDivision } from '@/lib/divisions';
import { DivisionIcon } from '@/components/DivisionBadge';
import { calculateTournamentAvgElo } from '@/data/mock';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

const formatLabels: Record<string, string> = {
  eliminacion_simple: 'Eliminación simple',
  eliminacion_doble: 'Eliminación doble',
  round_robin: 'Round Robin',
  grupos_cuadro: 'Grupos + Cuadro',
  suizo: 'Sistema suizo',
  americano: 'Americano',
  rey_mesa: 'Rey de la mesa',
};

const statusColors: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  abierto: 'bg-success/12 text-success',
  en_curso: 'bg-secondary/12 text-secondary',
  finalizado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-destructive/12 text-destructive',
};

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  abierto: 'Inscripción abierta',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export default function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const formattedDate = new Date(tournament.date).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98] border border-border/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-card-foreground truncate">{tournament.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-xl bg-primary/8 px-2.5 py-0.5 text-[10px] font-bold text-primary">{tournament.tableBrand}</span>
            <span className="rounded-xl bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground capitalize">{tournament.playStyle}</span>
            <span className="rounded-xl bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{formatLabels[tournament.format]}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formattedDate}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tournament.city}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{tournament.maxPairs}</span>
            {(() => {
              const { avgElo, count } = calculateTournamentAvgElo(tournament.id);
              if (count < 2) return null;
              const div = getDivision(avgElo);
              return <span className={`flex items-center gap-1 font-bold ${div.colorClass}`}><DivisionIcon iconName={div.iconName} className="h-3 w-3" /> {avgElo}</span>;
            })()}
          </div>
        </div>
        <span className={`shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-bold ${statusColors[tournament.status]}`}>
          {statusLabels[tournament.status]}
        </span>
      </div>
    </button>
  );
}
