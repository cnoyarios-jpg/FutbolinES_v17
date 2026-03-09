import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import {
  MOCK_TEAMS, getTeamLeagues, createTeamLeague, generateLeagueMatchdays,
  getTeamLeagueStandings, getTeamMatches, updateTeamMatchPairing,
  finalizeTeamMatch, getStoredTeams,
} from '@/data/mock';
import { Trophy, Plus, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamLeaguePage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [pairingsCount, setPairingsCount] = useState(3);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [expandedMatchday, setExpandedMatchday] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);

  const allTeams = [...MOCK_TEAMS, ...getStoredTeams().filter(t => !MOCK_TEAMS.some(m => m.id === t.id))];
  const leagues = getTeamLeagues();

  const toggleTeam = (id: string) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Nombre obligatorio'); return; }
    if (selectedTeams.length < 2) { toast.error('Mínimo 2 equipos'); return; }
    const league = createTeamLeague(name, selectedTeams, pairingsCount, season || undefined);
    generateLeagueMatchdays(league.id);
    setName(''); setSeason(''); setSelectedTeams([]); setShowCreate(false);
    toast.success('Liga creada con jornadas generadas');
    forceUpdate(n => n + 1);
  };

  const getTeamName = (id: string) => allTeams.find(t => t.id === id)?.name || id;

  const handleSetScore = (matchId: string, pairingId: string, score1: number, score2: number) => {
    updateTeamMatchPairing(matchId, pairingId, { score1, score2 });
    forceUpdate(n => n + 1);
  };

  const handleFinalizeMatch = (matchId: string) => {
    finalizeTeamMatch(matchId);
    toast.success('Enfrentamiento finalizado');
    forceUpdate(n => n + 1);
  };

  return (
    <PageShell title="Ligas de Equipos">
      {leagues.length === 0 && !showCreate && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay ligas de equipos. ¡Crea la primera!</p>
      )}

      {leagues.map(league => {
        const standings = getTeamLeagueStandings(league.id);
        const matches = getTeamMatches().filter(m => m.leagueId === league.id);
        const matchdays = [...new Set(matches.map(m => m.matchday).filter(Boolean))].sort((a, b) => a! - b!) as number[];
        const isExpanded = expandedLeague === league.id;

        return (
          <div key={league.id} className="mb-4 rounded-xl bg-card shadow-card overflow-hidden">
            <button onClick={() => setExpandedLeague(isExpanded ? null : league.id)}
              className="w-full flex items-center justify-between p-4">
              <div className="text-left">
                <h3 className="font-display font-bold text-sm">{league.name}</h3>
                <p className="text-[10px] text-muted-foreground">{league.teamIds.length} equipos · {league.season || 'Sin temporada'}</p>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4">
                {/* Standings */}
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Clasificación</h4>
                <div className="rounded-lg border border-border overflow-hidden mb-4">
                  <div className="grid grid-cols-[1fr_2rem_2rem_2rem_2.5rem_2.5rem] gap-0 text-[10px] font-semibold text-muted-foreground bg-muted px-3 py-1.5">
                    <span>Equipo</span><span className="text-center">PJ</span><span className="text-center">V</span>
                    <span className="text-center">D</span><span className="text-center">Dif</span><span className="text-center">Pts</span>
                  </div>
                  {standings.map((s, i) => (
                    <div key={s.teamId} className={`grid grid-cols-[1fr_2rem_2rem_2rem_2.5rem_2.5rem] gap-0 px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                      <span className="font-medium truncate">{i + 1}. {getTeamName(s.teamId)}</span>
                      <span className="text-center text-muted-foreground">{s.played}</span>
                      <span className="text-center text-success">{s.wins}</span>
                      <span className="text-center text-destructive">{s.losses}</span>
                      <span className="text-center text-muted-foreground">{s.pairingDiff > 0 ? '+' : ''}{s.pairingDiff}</span>
                      <span className="text-center font-bold text-primary">{s.points}</span>
                    </div>
                  ))}
                </div>

                {/* Matchdays */}
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Jornadas</h4>
                {matchdays.map(md => {
                  const mdMatches = matches.filter(m => m.matchday === md);
                  const isOpen = expandedMatchday === md;
                  return (
                    <div key={md} className="mb-2">
                      <button onClick={() => setExpandedMatchday(isOpen ? null : md)}
                        className="w-full flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs font-medium">
                        <span>Jornada {md}</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {isOpen && (
                        <div className="mt-1 space-y-2">
                          {mdMatches.map(match => (
                            <div key={match.id} className="rounded-lg border border-border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold">
                                  {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                                </p>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${match.status === 'finalizado' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                  {match.status === 'finalizado' ? (match.winnerId ? `Gana ${getTeamName(match.winnerId)}` : 'Empate') : 'Pendiente'}
                                </span>
                              </div>
                              {match.pairings.map((p, pi) => (
                                <div key={p.id} className="flex items-center gap-2 text-[11px] mb-1">
                                  <span className="text-muted-foreground w-4">P{pi + 1}</span>
                                  {match.status !== 'finalizado' ? (
                                    <>
                                      <input type="number" min={0} className="w-10 rounded border border-input bg-background px-1 py-0.5 text-center text-xs"
                                        value={p.score1 ?? ''} onChange={e => handleSetScore(match.id, p.id, parseInt(e.target.value) || 0, p.score2 ?? 0)} />
                                      <span className="text-muted-foreground">-</span>
                                      <input type="number" min={0} className="w-10 rounded border border-input bg-background px-1 py-0.5 text-center text-xs"
                                        value={p.score2 ?? ''} onChange={e => handleSetScore(match.id, p.id, p.score1 ?? 0, parseInt(e.target.value) || 0)} />
                                    </>
                                  ) : (
                                    <span className={`font-medium ${p.winnerId === 'team1' ? 'text-success' : p.winnerId === 'team2' ? 'text-destructive' : ''}`}>
                                      {p.score1} - {p.score2}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {match.status !== 'finalizado' && (
                                <button onClick={() => handleFinalizeMatch(match.id)}
                                  className="mt-2 flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                                  <Check className="h-3 w-3" /> Finalizar
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* FAB */}
      <button onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-elevated text-secondary-foreground transition hover:opacity-90 active:scale-90">
        <Plus className="h-6 w-6" />
      </button>

      {/* CREATE DIALOG */}
      {showCreate && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Crear liga de equipos</h3>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre *</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Temporada</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 2026 Primavera" value={season} onChange={e => setSeason(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Partidos por enfrentamiento</label>
                <select className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={pairingsCount} onChange={e => setPairingsCount(Number(e.target.value))}>
                  <option value={1}>1</option><option value={3}>3</option><option value={5}>5</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Equipos ({selectedTeams.length} seleccionados)</label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                  {allTeams.map(team => (
                    <button key={team.id} onClick={() => toggleTeam(team.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition ${selectedTeams.includes(team.id) ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                      <span className="font-medium">{team.name}</span>
                      {selectedTeams.includes(team.id) && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Crear</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
