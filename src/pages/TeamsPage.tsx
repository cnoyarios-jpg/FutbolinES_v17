import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import {
  MOCK_TEAMS, MOCK_RANKINGS, MOCK_VENUES,
  getCurrentUser, saveTeam, updateTeam, deleteTeam,
  getTeamMembers, addTeamMember, respondTeamInvite, getTeamStats,
  searchPlayers, addNotification, getTeamMatchesForTeam, getTeamLeagues,
  getTeamLeagueStandings, getStoredTeams, fixTeamMemberConsistency,
  getTeamJoinRequests, createJoinRequest, respondJoinRequest, getUserTeam,
} from '@/data/mock';
import { VenueSearchCombobox } from '@/components/VenueSearchCombobox';
import { MapPin, Plus, X, Users, Settings, Trash2, UserPlus, Check, Shield, Trophy, Swords } from 'lucide-react';
import { Team, TeamMember } from '@/types';
import { toast } from 'sonner';

export default function TeamsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [, forceUpdate] = useState(0);

  const currentUser = getCurrentUser();

  // Fix inconsistent teams on load
  useState(() => { fixTeamMemberConsistency(); });

  const [form, setForm] = useState({ name: '', city: '', postalCode: '', description: '', venueId: '' });
  const [editForm, setEditForm] = useState({ name: '', city: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);

  const allTeams = [...MOCK_TEAMS, ...getStoredTeams().filter(t => !MOCK_TEAMS.some(m => m.id === t.id))].sort((a, b) => b.elo - a.elo);

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Nombre obligatorio'); return; }
    if (!form.city.trim()) { toast.error('Ciudad obligatoria'); return; }
    if (!currentUser) { toast.error('Debes iniciar sesión'); return; }
    // Check duplicate team name
    if (allTeams.some(t => t.name.toLowerCase() === form.name.trim().toLowerCase())) {
      toast.error('Ya existe un equipo con ese nombre'); return;
    }
    // Check player already in a team
    const existingTeam = getUserTeam(currentUser.id);
    if (existingTeam) {
      toast.error(`Ya perteneces al equipo "${existingTeam.name}". Debes abandonarlo primero.`); return;
    }
    const newTeam: Team = {
      id: `team_${Date.now()}`, name: form.name, city: form.city,
      postalCode: form.postalCode || undefined,
      venueId: form.venueId || undefined,
      description: form.description || undefined,
      captainId: currentUser.id, elo: 1500,
      createdAt: new Date().toISOString().split('T')[0],
    };
    saveTeam(newTeam);
    addTeamMember({
      id: `tm_${Date.now()}`, teamId: newTeam.id, userId: currentUser.id,
      displayName: currentUser.displayName, role: 'capitan',
      joinedAt: new Date().toISOString().split('T')[0], status: 'aceptada',
    });
    setForm({ name: '', city: '', postalCode: '', description: '', venueId: '' });
    setShowCreate(false);
    toast.success('Equipo creado');
    forceUpdate(n => n + 1);
  };

  const handleDelete = (teamId: string) => {
    deleteTeam(teamId);
    setShowDetail(null);
    toast.success('Equipo eliminado');
    forceUpdate(n => n + 1);
  };

  const handleSaveEdit = (teamId: string) => {
    updateTeam(teamId, { name: editForm.name, city: editForm.city, description: editForm.description });
    setIsEditing(false);
    toast.success('Equipo actualizado');
    forceUpdate(n => n + 1);
  };

  const handleInvite = (teamId: string, userId: string, displayName: string) => {
    addTeamMember({
      id: `tm_${Date.now()}`, teamId, userId, displayName,
      role: 'jugador', joinedAt: new Date().toISOString().split('T')[0],
      status: 'pendiente',
    });
    addNotification({ userId, type: 'team_invite', title: 'Invitación a equipo', body: `Te han invitado a unirte a un equipo` });
    setInviteSearch('');
    toast.success(`Invitación enviada a ${displayName}`);
    forceUpdate(n => n + 1);
  };

  const detailTeam = showDetail ? allTeams.find(t => t.id === showDetail) : null;
  const detailMembers = showDetail ? getTeamMembers(showDetail) : [];
  const detailStats = showDetail ? getTeamStats(showDetail) : null;
  const isCaptain = detailTeam && currentUser && detailTeam.captainId === currentUser.id;
  const pendingRequests = showDetail ? getTeamJoinRequests(showDetail).filter(r => r.status === 'pendiente') : [];
  const isMember = currentUser ? detailMembers.some(m => m.userId === currentUser.id) : false;

  // Enhanced profile data
  const recentMatches = showDetail ? getTeamMatchesForTeam(showDetail).filter(m => m.status === 'finalizado').slice(-5).reverse() : [];
  const teamLeaguePosition = (() => {
    if (!showDetail) return null;
    const leagues = getTeamLeagues().filter(l => l.teamIds.includes(showDetail));
    if (leagues.length === 0) return null;
    const league = leagues[leagues.length - 1]; // latest league
    const standings = getTeamLeagueStandings(league.id);
    const pos = standings.findIndex(s => s.teamId === showDetail);
    return pos >= 0 ? { leagueName: league.name, position: pos + 1, total: standings.length } : null;
  })();

  const winrate = detailStats && detailStats.matchesPlayed > 0 ? Math.round((detailStats.wins / detailStats.matchesPlayed) * 100) : 0;
  const captainName = detailTeam ? (MOCK_RANKINGS.find(r => r.userId === detailTeam.captainId)?.displayName || detailMembers.find(m => m.role === 'capitan')?.displayName || '') : '';
  const venueObj = detailTeam?.venueId ? MOCK_VENUES.find(v => v.id === detailTeam.venueId) : null;

  const inviteResults = inviteSearch.length >= 2 ? searchPlayers(inviteSearch).filter(p => !detailMembers.some(m => m.userId === p.userId)) : [];

  const getTeamName = (id: string) => allTeams.find(t => t.id === id)?.name || id;

  const handleJoinRequest = () => {
    if (!currentUser || !detailTeam) return;
    // Check if already in another team
    const existingTeam = getUserTeam(currentUser.id);
    if (existingTeam && existingTeam.id !== detailTeam.id) {
      toast.error(`Ya perteneces al equipo "${existingTeam.name}". Debes abandonarlo primero.`);
      return;
    }
    const result = createJoinRequest(detailTeam.id, currentUser.id, currentUser.displayName);
    if (result.success) { toast.success('Solicitud enviada'); forceUpdate(n => n + 1); }
    else { toast.error(result.error || 'Error'); }
  };
  const handleAcceptRequest = (reqId: string) => { respondJoinRequest(reqId, true); toast.success('Solicitud aceptada'); forceUpdate(n => n + 1); };
  const handleRejectRequest = (reqId: string) => { respondJoinRequest(reqId, false); toast.success('Solicitud rechazada'); forceUpdate(n => n + 1); };

  return (
    <PageShell title="Equipos">
      {/* Navigation links */}
      <div className="flex gap-2 mb-4">
        <Link to="/equipos/ligas" className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Trophy className="h-3.5 w-3.5" /> Ligas
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {allTeams.map((team, i) => (
          <button key={team.id} onClick={() => { setShowDetail(team.id); setIsEditing(false); }}
            className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-card text-left w-full hover:shadow-elevated transition-shadow">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : i === 1 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold truncate">{team.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><MapPin className="h-3 w-3" />{team.city}</div>
            </div>
            <div className="text-right"><p className="font-display text-xl font-bold text-primary">{team.elo}</p><p className="text-[10px] text-muted-foreground">ELO</p></div>
          </button>
        ))}
        {allTeams.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay equipos. ¡Crea el primero!</p>}
      </div>

      <button onClick={() => setShowCreate(true)} className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-elevated text-secondary-foreground transition hover:opacity-90 active:scale-90">
        <Plus className="h-6 w-6" />
      </button>

      {/* CREATE DIALOG */}
      {showCreate && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Crear equipo</h3>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre *</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciudad *</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código postal</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bar asociado (opcional)</label>
                <VenueSearchCombobox
                  value={form.venueId}
                  onValueChange={(venueId) => setForm(f => ({ ...f, venueId }))}
                  placeholder="Buscar bar..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
                <textarea className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DIALOG */}
      {showDetail && detailTeam && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">{isEditing ? 'Editar equipo' : detailTeam.name}</h3>
              <button onClick={() => setShowDetail(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre</label>
                  <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Ciudad</label>
                  <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Descripción</label>
                  <textarea className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
                  <button onClick={() => handleSaveEdit(detailTeam.id)} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Guardar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />{detailTeam.city}
                  {detailTeam.postalCode && <span>· CP {detailTeam.postalCode}</span>}
                </div>
                {captainName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Shield className="h-3 w-3 text-accent" /> Capitán: <span className="font-medium text-foreground">{captainName}</span>
                  </div>
                )}
                {venueObj && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" /> Bar base: <span className="font-medium text-foreground">{venueObj.name}</span>
                  </div>
                )}
                {detailTeam.description && <p className="text-sm text-foreground mb-3">{detailTeam.description}</p>}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="font-display text-lg font-bold text-primary">{detailStats?.matchesPlayed || 0}</p>
                    <p className="text-[9px] text-muted-foreground">PJ</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="font-display text-lg font-bold text-success">{detailStats?.wins || 0}</p>
                    <p className="text-[9px] text-muted-foreground">V</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="font-display text-lg font-bold text-destructive">{detailStats?.losses || 0}</p>
                    <p className="text-[9px] text-muted-foreground">D</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="font-display text-lg font-bold text-foreground">{winrate}%</p>
                    <p className="text-[9px] text-muted-foreground">WR</p>
                  </div>
                </div>

                {/* League position */}
                {teamLeaguePosition && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Trophy className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-primary">{teamLeaguePosition.leagueName}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Posición <span className="font-bold text-foreground">{teamLeaguePosition.position}º</span> de {teamLeaguePosition.total}
                    </p>
                  </div>
                )}

                {/* Recent matches */}
                {recentMatches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Swords className="h-3.5 w-3.5" /> Últimos enfrentamientos
                    </h4>
                    <div className="flex flex-col gap-1">
                      {recentMatches.map(m => {
                        const isWin = m.winnerId === showDetail;
                        const opponentId = m.team1Id === showDetail ? m.team2Id : m.team1Id;
                        return (
                          <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                            <span className="font-medium truncate">{getTeamName(opponentId)}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isWin ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {isWin ? 'V' : 'D'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1"><Users className="h-4 w-4" /> Miembros ({detailMembers.length})</h4>
                    {isCaptain && <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 text-xs font-semibold text-primary"><UserPlus className="h-3.5 w-3.5" /> Invitar</button>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {detailMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{m.displayName}</span>
                          {m.role === 'capitan' && <Shield className="h-3 w-3 text-accent" />}
                          <span className="text-muted-foreground capitalize">{m.role}</span>
                        </div>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${m.status === 'aceptada' ? 'bg-success/10 text-success' : m.status === 'rechazada' ? 'bg-destructive/10 text-destructive' : 'bg-warning/20 text-warning-foreground'}`}>
                          {m.status || 'aceptada'}
                        </span>
                      </div>
                    ))}
                    {detailMembers.length === 0 && <p className="text-xs text-muted-foreground">Sin miembros aún</p>}
                  </div>
                </div>

                {/* Pending join requests (captain only) */}
                {isCaptain && pendingRequests.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Solicitudes pendientes</h4>
                    {pendingRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 mb-1 text-xs">
                        <span className="font-medium">{req.displayName}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleAcceptRequest(req.id)} className="rounded bg-success/10 px-2 py-1 text-success font-medium">Aceptar</button>
                          <button onClick={() => handleRejectRequest(req.id)} className="rounded bg-destructive/10 px-2 py-1 text-destructive font-medium">Rechazar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isCaptain && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditForm({ name: detailTeam.name, city: detailTeam.city, description: detailTeam.description || '' }); setIsEditing(true); }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">
                      <Settings className="h-4 w-4" /> Editar
                    </button>
                    <button onClick={() => handleDelete(detailTeam.id)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!isCaptain && currentUser && !isMember && (
                  <button onClick={handleJoinRequest}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground mt-2">
                    Solicitar unirme
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* INVITE DIALOG */}
      {showInvite && detailTeam && (
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
                  <button key={p.userId} onClick={() => handleInvite(detailTeam.id, p.userId, p.displayName)}
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
