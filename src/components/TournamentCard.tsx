import { Tournament } from '@/types';
import { Calendar, MapPin, Users, Trophy } from 'lucide-react';
import { getDivision } from '@/lib/divisions';
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
  abierto: 'bg-success text-success-foreground',
  en_curso: 'bg-secondary text-secondary-foreground',
  finalizado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
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
      className="w-full text-left rounded-lg bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-card-foreground truncate">{tournament.name}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{tournament.tableBrand}</span>
            <span className="rounded-md bg-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground capitalize">{tournament.playStyle}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{formatLabels[tournament.format]}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formattedDate}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{tournament.city}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tournament.maxPairs}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusColors[tournament.status]}`}>
          {statusLabels[tournament.status]}
        </span>
      </div>
    </button>
  );
}
