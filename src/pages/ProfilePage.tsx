import PageShell from '@/components/PageShell';
import { MOCK_USER, MOCK_RANKINGS, MOCK_TEAMS } from '@/data/mock';
import { Settings, Trophy, Shield, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const user = MOCK_USER;
  const rating = MOCK_RANKINGS.find(r => r.userId === user.id);
  const teams = MOCK_TEAMS.filter(t => t.captainId === user.id);
  const winrate = rating && (rating.wins + rating.losses > 0) ? Math.round((rating.wins / (rating.wins + rating.losses)) * 100) : 0;

  return (
    <PageShell>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-bold text-primary">
            {user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{user.displayName}</h1>
            <p className="text-sm text-muted-foreground">{user.city}</p>
            <div className="mt-1 flex gap-1.5">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">{user.preferredPosition}</span>
              <span className="rounded-md bg-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground capitalize">{user.preferredStyle}</span>
            </div>
          </div>
        </div>
        <button className="rounded-lg bg-muted p-2"><Settings className="h-5 w-5 text-muted-foreground" /></button>
      </div>

      {rating && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card p-3 shadow-card text-center">
            <Trophy className="h-4 w-4 mx-auto text-accent" />
            <p className="mt-1 font-display text-lg font-bold">{rating.general}</p>
            <p className="text-[10px] text-muted-foreground">ELO General</p>
          </div>
          <div className="rounded-xl bg-card p-3 shadow-card text-center">
            <Shield className="h-4 w-4 mx-auto text-primary" />
            <p className="mt-1 font-display text-lg font-bold">{rating.asGoalkeeper}</p>
            <p className="text-[10px] text-muted-foreground">Portero</p>
          </div>
          <div className="rounded-xl bg-card p-3 shadow-card text-center">
            <Target className="h-4 w-4 mx-auto text-secondary" />
            <p className="mt-1 font-display text-lg font-bold">{rating.asForward}</p>
            <p className="text-[10px] text-muted-foreground">Delantero</p>
          </div>
        </div>
      )}

      {rating && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="font-display text-xl font-bold text-green-600">{rating.wins}</p><p className="text-[10px] text-muted-foreground">Victorias</p></div>
            <div><p className="font-display text-xl font-bold text-red-500">{rating.losses}</p><p className="text-[10px] text-muted-foreground">Derrotas</p></div>
            <div><p className="font-display text-xl font-bold">{winrate}%</p><p className="text-[10px] text-muted-foreground">Win Rate</p></div>
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold flex items-center gap-1.5"><Users className="h-4 w-4" /> Mis equipos</h2>
            <Link to="/equipos" className="text-xs font-semibold text-primary">Ver todos</Link>
          </div>
          <div className="flex flex-col gap-2">
            {teams.map(team => (
              <div key={team.id} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.city}</p>
                </div>
                <p className="font-display text-lg font-bold text-primary">{team.elo}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
