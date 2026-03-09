import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { getPlayerMvpRecords, MOCK_TOURNAMENTS } from '@/data/mock';

const formatLabels: Record<string, string> = {
  eliminacion_simple: 'Eliminación',
  eliminacion_doble: 'Doble elim.',
  round_robin: 'Round Robin',
  grupos_cuadro: 'Grupos + Cuadro',
  rey_mesa: 'Rey de la mesa',
};

interface MvpHistorySectionProps {
  userId: string;
}

export default function MvpHistorySection({ userId }: MvpHistorySectionProps) {
  const mvpRecords = getPlayerMvpRecords(userId);
  
  // Also check tournaments for legacy MVP data
  const legacyMvpTournaments = MOCK_TOURNAMENTS.filter(t => 
    t.mvpPlayerId === userId && !mvpRecords.some(r => r.tournamentId === t.id)
  );
  
  const allMvps = [
    ...mvpRecords,
    ...legacyMvpTournaments.map(t => ({
      tournamentId: t.id,
      tournamentName: t.name,
      date: t.date,
      venueName: t.venueName,
      format: t.format,
      avgElo: 0, // Legacy data doesn't have this
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allMvps.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
      <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
        <Award className="h-4 w-4 text-accent" /> Jugador del torneo ({allMvps.length})
      </h3>
      <div className="flex flex-col gap-2">
        {allMvps.map((mvp, idx) => (
          <Link 
            key={mvp.tournamentId + idx} 
            to={`/torneos/${mvp.tournamentId}`} 
            className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs hover:bg-muted/80 transition"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{mvp.tournamentName}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                {mvp.venueName && <span>📍 {mvp.venueName}</span>}
                {mvp.format && <span className="text-[10px]">{formatLabels[mvp.format] || mvp.format}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-muted-foreground">
                {new Date(mvp.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </span>
              {mvp.avgElo > 0 && (
                <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  ELO medio: {mvp.avgElo}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
