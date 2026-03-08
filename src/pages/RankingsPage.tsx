import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_RANKINGS } from '@/data/mock';
import { Trophy, Shield, Target } from 'lucide-react';

type RankingView = 'general' | 'porteros' | 'delanteros';

export default function RankingsPage() {
  const [view, setView] = useState<RankingView>('general');

  // Filter out guest players from ranking
  const registeredOnly = MOCK_RANKINGS.filter(r => r.playerType !== 'invitado');

  const sorted = [...registeredOnly].sort((a, b) => {
    if (view === 'porteros') return b.asGoalkeeper - a.asGoalkeeper;
    if (view === 'delanteros') return b.asForward - a.asForward;
    return b.general - a.general;
  });

  const getElo = (player: typeof sorted[0]) => {
    if (view === 'porteros') return player.asGoalkeeper;
    if (view === 'delanteros') return player.asForward;
    return player.general;
  };

  return (
    <PageShell title="Ranking">
      <div className="mb-4 flex gap-1.5">
        {([
          { key: 'general' as const, label: 'General', icon: Trophy },
          { key: 'porteros' as const, label: 'Porteros', icon: Shield },
          { key: 'delanteros' as const, label: 'Delanteros', icon: Target },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setView(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${view === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((player, i) => (
          <Link key={player.userId} to={`/perfil/${player.userId}`}>
            <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card hover:shadow-elevated transition-shadow">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : i === 1 ? 'bg-muted text-muted-foreground' : i === 2 ? 'bg-secondary/20 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{player.displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[10px] text-muted-foreground">{player.city}</p>
                  {player.preferredPosition && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary capitalize">{player.preferredPosition}</span>
                  )}
                  {player.preferredTable && (
                    <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[9px] font-semibold text-secondary">{player.preferredTable}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-primary">{getElo(player)}</p>
                <p className="text-[10px] text-muted-foreground">{player.wins}V / {player.losses}D</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
