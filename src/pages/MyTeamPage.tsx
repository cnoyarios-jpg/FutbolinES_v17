import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import {
  getCurrentUser, getUserTeam, getTeamMembers, getTeamStats,
  getTeamJoinRequests, respondJoinRequest, searchPlayers,
  addTeamMember, addNotification, MOCK_RANKINGS,
  getTeamMatchesForTeam,
} from '@/data/mock';
import { Shield, Users, MapPin, Trophy, Plus, UserPlus, Check, X, Swords, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function MyTeamPage() {
  const [, forceUpdate] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return (
      <PageShell title="Mi equipo">
        <p className="text-sm text-muted-foreground text-center py-8">Inicia sesión para ver tu equipo.</p>
      </PageShell>
    );
  }

  const team = getUserTeam(currentUser.id);

  if (!team) {
    return (
      <PageShell title="Mi equipo">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Users className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="font-display text-lg font-bold text-center">No perteneces a ningún equipo</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Crea tu propio equipo o busca uno al que unirte.
          </p>
          <div className="flex gap-3">
            <Link to="/equipos" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4 inline mr-1" /> Crear equipo
            </Link>
            <Link to="/equipos" className="rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4 inline mr-1" /> Buscar equipos
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const members = getTeamMembers(team.id);
  const stats = getTeamStats(team.id);
  const isCaptain = team.captainId === currentUser.id;
  const pendingRequests = getTeamJoinRequests(team.id).filter(r => r.status === 'pendiente');
  const winrate = stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;
  const captainName = MOCK_RANKINGS.find(r => r.userId === team.captainId)?.displayName || members.find(m => m.role === 'capitan')?.displayName || '';
  const recentMatches = getTeamMatchesForTeam(team.id).filter(m => m.status === 'finalizado').slice(-5).reverse();
  const allTeamsForName = (id: string) => {
    const t = members.find(m => m.teamId === id);
    return t?.displayName || id;
  };

  const inviteResults = inviteSearch.length >= 2 ? searchPlayers(inviteSearch).filter(p => !members.some(m => m.userId === p.userId)) : [];

  const handleAcceptRequest = (reqId: string) => { respondJoinRequest(reqId, true); toast.success('Solicitud aceptada'); forceUpdate(n => n + 1); };
  const handleRejectRequest = (reqId: string) => { respondJoinRequest(reqId, false); toast.success('Solicitud rechazada'); forceUpdate(n => n + 1); };

  const handleInvite = (userId: string, displayName: string) => {
    addTeamMember({
      id: `tm_${Date.now()}`, teamId: team.id, userId, displayName,
      role: 'jugador', joinedAt: new Date().toISOString().split('T')[0], status: 'pendiente',
    });
    addNotification({ userId, type: 'team_invite', title: 'Invitación a equipo', body: `Te han invitado a unirte a ${team.name}` });
    setInviteSearch('');
    toast.success(`Invitación enviada a ${displayName}`);
    forceUpdate(n => n + 1);
  };

  return (
    <PageShell title="Mi equipo">
      {/* Team header */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-display text-xl font-bold text-primary">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold truncate">{team.name}</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{team.city}</div>
            {captainName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Shield className="h-3 w-3 text-accent" /> Capitán: <span className="font-medium text-foreground">{captainName}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold text-primary">{team.elo}</p>
            <p className="text-[10px] text-muted-foreground">ELO</p>
          </div>
        </div>
        {team.description && <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-2">{team.description}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        <div className="rounded-lg bg-card p-2 text-center shadow-card">
          <p className="font-display text-lg font-bold text-primary">{stats.matchesPlayed}</p>
          <p className="text-[9px] text-muted-foreground">PJ</p>
        </div>
        <div className="rounded-lg bg-card p-2 text-center shadow-card">
          <p className="font-display text-lg font-bold text-success">{stats.wins}</p>
          <p className="text-[9px] text-muted-foreground">V</p>
        </div>
        <div className="rounded-lg bg-card p-2 text-center shadow-card">
          <p className="font-display text-lg font-bold text-destructive">{stats.losses}</p>
          <p className="text-[9px] text-muted-foreground">D</p>
        </div>
        <div className="rounded-lg bg-card p-2 text-center shadow-card">
          <p className="font-display text-lg font-bold text-foreground">{winrate}%</p>
          <p className="text-[9px] text-muted-foreground">WR</p>
        </div>
      </div>

      {/* Pending requests (captain only) */}
      {isCaptain && pendingRequests.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-primary" /> Solicitudes pendientes ({pendingRequests.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs">
                <span className="font-medium">{req.displayName}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleAcceptRequest(req.id)} className="rounded bg-success/10 px-2 py-1 text-success font-medium">
                    <Check className="h-3 w-3 inline" /> Aceptar
                  </button>
                  <button onClick={() => handleRejectRequest(req.id)} className="rounded bg-destructive/10 px-2 py-1 text-destructive font-medium">
                    <X className="h-3 w-3 inline" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-4 w-4" /> Miembros ({members.length})</h3>
          {isCaptain && <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 text-xs font-semibold text-primary"><UserPlus className="h-3.5 w-3.5" /> Invitar</button>}
        </div>
        <div className="flex flex-col gap-1.5">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{m.displayName}</span>
                {m.role === 'capitan' && <Shield className="h-3 w-3 text-accent" />}
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${m.status === 'aceptada' ? 'bg-success/10 text-success' : m.status === 'rechazada' ? 'bg-destructive/10 text-destructive' : 'bg-warning/20 text-warning-foreground'}`}>
                {m.status || 'aceptada'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Swords className="h-4 w-4" /> Últimos enfrentamientos
          </h3>
          <div className="flex flex-col gap-1">
            {recentMatches.map(m => {
              const isWin = m.winnerId === team.id;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                  <span className="font-medium truncate">vs {m.team1Id === team.id ? m.team2Id : m.team1Id}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isWin ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {isWin ? 'V' : 'D'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link to="/equipos" className="block text-center text-sm text-primary font-semibold py-2">
        Ver todos los equipos →
      </Link>

      {/* Invite dialog */}
      {showInvite && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Invitar jugador</h3>
              <button onClick={() => { setShowInvite(false); setInviteSearch(''); }}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <input className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Buscar jugador..." value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} />
            {inviteResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
                {inviteResults.map(p => (
                  <button key={p.userId} onClick={() => handleInvite(p.userId, p.displayName)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition">
                    <span className="font-medium">{p.displayName}</span>
                    <span className="text-xs text-primary">Invitar</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
