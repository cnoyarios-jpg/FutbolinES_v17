import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_RANKINGS, MOCK_TEAMS, MOCK_VENUES, MOCK_TOURNAMENTS, MOCK_PAIRS, getAllPairRankings, getVenueRankings, getTeamRanking, isGuestPlayer, getCityFromPostalCode } from '@/data/mock';
import { getDivision, DIVISION_DEFS, getSubdivisionRanges } from '@/lib/divisions';
import { DivisionIcon } from '@/components/DivisionBadge';
import { Trophy, Shield, Target, Users, Handshake, MapPin, Filter, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { TableBrand } from '@/types';

type RankingTab = 'individual' | 'parejas' | 'equipos' | 'bares';
type RankingView = 'general' | 'porteros' | 'delanteros';
type RankingMode = 'parado' | 'movimiento';

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];

export default function RankingsPage() {
  const [tab, setTab] = useState<RankingTab>('individual');
  const [view, setView] = useState<RankingView>('general');
  const [mode, setMode] = useState<RankingMode>('parado');
  const [showFilters, setShowFilters] = useState(false);
  const [showDivisionInfo, setShowDivisionInfo] = useState(false);

  // Filters
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterPostalCode, setFilterPostalCode] = useState('');
  const [filterVenue, setFilterVenue] = useState<string>('');

  const hasActiveFilters = filterTable || filterPostalCode || filterVenue;

  const clearFilters = () => {
    setFilterTable('');
    setFilterPostalCode('');
    setFilterVenue('');
  };

  const getVenuePlayerIds = (venueId: string): Set<string> => {
    const ids = new Set<string>();
    MOCK_TOURNAMENTS.filter(t => t.venueId === venueId).forEach(t => {
      MOCK_PAIRS.filter(p => p.tournamentId === t.id).forEach(p => {
        ids.add(p.goalkeeper.userId);
        ids.add(p.forward.userId);
      });
    });
    return ids;
  };

  const registeredOnly = MOCK_RANKINGS.filter(r => r.playerType !== 'invitado');

  let filtered = registeredOnly;
  if (filterTable) {
    filtered = filtered.filter(r => r.preferredTable === filterTable);
  }
  if (filterPostalCode) {
    filtered = filtered.filter(r => r.postalCode && r.postalCode.startsWith(filterPostalCode));
  }
  if (filterVenue) {
    const venuePlayerIds = getVenuePlayerIds(filterVenue);
    filtered = filtered.filter(r => venuePlayerIds.has(r.userId));
  }

  const getElo = (player: typeof filtered[0]) => {
    if (view === 'general') return player.general;
    if (view === 'porteros') {
      return mode === 'parado' 
        ? (player.goalkeeperStill ?? player.asGoalkeeper) 
        : (player.goalkeeperMoving ?? player.asGoalkeeper);
    }
    return mode === 'parado' 
      ? (player.forwardStill ?? player.asForward) 
      : (player.forwardMoving ?? player.asForward);
  };

  const sorted = [...filtered].sort((a, b) => getElo(b) - getElo(a));

  const getEloLabel = () => {
    if (view === 'general') return 'ELO General';
    if (view === 'porteros') return mode === 'parado' ? 'ELO Portero Parado' : 'ELO Portero Movimiento';
    return mode === 'parado' ? 'ELO Delantero Parado' : 'ELO Delantero Movimiento';
  };

  const getPlayerLocation = (player: typeof filtered[0]) => {
    const province = player.postalCode ? getCityFromPostalCode(player.postalCode) : '';
    if (player.postalCode && province) return `CP ${player.postalCode} · ${province}`;
    if (player.postalCode) return `CP ${player.postalCode}`;
    if (player.city) return player.city;
    return '';
  };

  const pairRankings = getAllPairRankings();
  const venueRankings = getVenueRankings();
  const teamRanking = getTeamRanking();
  const activeVenues = MOCK_VENUES.filter(v => v.status === 'activo');

  return (
    <PageShell title="Ranking">
      {/* Row 1: Category tabs */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {([
          { key: 'individual' as const, label: 'Individual', icon: Trophy },
          { key: 'parejas' as const, label: 'Parejas', icon: Handshake },
          { key: 'equipos' as const, label: 'Equipos', icon: Users },
          { key: 'bares' as const, label: 'Bares', icon: MapPin },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap ${tab === key ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground border border-border/50 hover:bg-muted'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* === INDIVIDUAL === */}
      {tab === 'individual' && (
        <>
          {/* Row 2: Position view */}
          <div className="mb-2.5 flex items-center gap-1.5">
            {([
              { key: 'general' as const, label: 'General', icon: Trophy },
              { key: 'porteros' as const, label: 'Porteros', icon: Shield },
              { key: 'delanteros' as const, label: 'Delanteros', icon: Target },
            ]).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setView(key)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${view === key ? 'bg-secondary text-secondary-foreground shadow-md' : 'bg-card text-muted-foreground border border-border/50 hover:bg-muted'}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`ml-auto flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${showFilters || hasActiveFilters ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground border border-border/50'}`}>
              <Filter className="h-3.5 w-3.5" />
              {hasActiveFilters && <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[9px]">!</span>}
            </button>
          </div>

          {/* Row 3: Mode selector (only for porteros/delanteros) */}
          {view !== 'general' && (
            <div className="mb-3 flex gap-1.5">
              {(['parado', 'movimiento'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${mode === m ? 'bg-accent text-accent-foreground shadow-md' : 'bg-card text-muted-foreground border border-border/50 hover:bg-muted'}`}>
                  {m === 'parado' ? '🧱 Parado' : '💨 Movimiento'}
                </button>
              ))}
            </div>
          )}

          {/* Division info */}
          <button
            onClick={() => setShowDivisionInfo(!showDivisionInfo)}
            className="mb-3 w-full flex items-center justify-between rounded-xl bg-card p-3.5 shadow-card text-xs font-medium text-muted-foreground hover:bg-muted/60 transition border border-border/30"
          >
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              <span>¿Qué significan las divisiones?</span>
            </div>
            {showDivisionInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showDivisionInfo && (
            <div className="mb-4 rounded-2xl bg-card p-4 shadow-elevated border border-border/30">
              <h4 className="text-xs font-bold text-foreground mb-3">Sistema de Divisiones</h4>
              <div className="flex flex-col gap-2">
                {DIVISION_DEFS.map(d => {
                  const subs = getSubdivisionRanges(d);
                  return (
                    <div key={d.name} className="rounded-xl bg-muted/60 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <DivisionIcon iconName={d.iconName} className="h-5 w-5" />
                          <span className={`text-xs font-bold ${d.colorClass}`}>{d.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {d.min} – {d.max === 99999 ? '3500+' : d.max}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 ml-7">
                        {subs.map(sub => (
                          <div key={sub.sublevel} className="flex items-center justify-between text-[10px]">
                            <span className={`font-semibold ${d.colorClass}`}>{d.name} {sub.sublevel}</span>
                            <span className="text-muted-foreground font-mono">
                              {sub.min} – {sub.max === 99999 ? '∞' : sub.max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters panel */}
          {showFilters && (
            <div className="mb-4 rounded-2xl bg-card p-4 shadow-elevated border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Filtros
                </h4>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                    <X className="h-3 w-3" /> Limpiar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Mesa</label>
                  <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Todas</option>
                    {TABLE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Código postal</label>
                  <input value={filterPostalCode} onChange={e => setFilterPostalCode(e.target.value)}
                    placeholder="Ej: 28"
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Bar</label>
                  <select value={filterVenue} onChange={e => setFilterVenue(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Todos</option>
                    {activeVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              {hasActiveFilters && (
                <p className="mt-2 text-[10px] text-muted-foreground">{sorted.length} jugador{sorted.length !== 1 ? 'es' : ''} encontrado{sorted.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {/* Current view label */}
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">{getEloLabel()}</p>

          <div className="flex flex-col gap-2.5">
            {sorted.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No se encontraron jugadores con estos filtros.</p>
            )}
            {sorted.map((player, i) => {
              const elo = getElo(player);
              const div = getDivision(elo);
              const isTop3 = i < 3;
              const medalColors = ['text-accent', 'text-muted-foreground', 'text-secondary'];
              const playerLocation = getPlayerLocation(player);
              return (
              <Link key={player.userId} to={`/perfil/${player.userId}`}>
                <div className={`flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card hover:shadow-elevated transition-all border border-border/30 ${isTop3 ? 'border-l-[3px] border-l-primary/50' : ''}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${isTop3 ? 'bg-primary/10 ' + medalColors[i] : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{player.displayName}</p>
                      <span className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[9px] font-bold ${div.bgClass} ${div.colorClass}`}>
                        <DivisionIcon iconName={div.iconName} className="h-3 w-3" /> {div.sublevel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">
                        {playerCity && player.postalCode
                          ? `${playerCity} · CP ${player.postalCode}`
                          : playerCity || (player.postalCode ? `CP ${player.postalCode}` : '')}
                      </p>
                      {player.preferredPosition && (
                        <span className="rounded-lg bg-primary/8 px-1.5 py-0.5 text-[9px] font-bold text-primary capitalize">{player.preferredPosition}</span>
                      )}
                      {player.preferredTable && (
                        <span className="rounded-lg bg-secondary/8 px-1.5 py-0.5 text-[9px] font-bold text-secondary">{player.preferredTable}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-primary">{elo}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{player.wins}V / {player.losses}D</p>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </>
      )}

      {/* === PAREJAS === */}
      {tab === 'parejas' && (
        <div className="flex flex-col gap-2.5">
          {pairRankings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay historial de parejas aún.</p>}
          {pairRankings.map((pr, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card border border-border/30">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{pr.goalkeeperName} / {pr.forwardName}</p>
                <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="text-success">{pr.wins}V</span>
                  <span className="text-destructive">{pr.losses}D</span>
                  <span>{pr.winrate}% WR</span>
                  {pr.tournamentsWon > 0 && <span>🏆 {pr.tournamentsWon}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-primary">{pr.pairElo}</p>
                <p className="text-[10px] text-muted-foreground">ELO</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === EQUIPOS === */}
      {tab === 'equipos' && (
        <div className="flex flex-col gap-2.5">
          {teamRanking.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay equipos registrados.</p>}
          {teamRanking.map((team, i) => (
            <Link key={team.id} to={`/equipos/${team.id}`}>
              <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card hover:shadow-elevated transition-shadow border border-border/30">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{team.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />{team.city}
                    <span className="text-success">{team.stats.wins}V</span>
                    <span className="text-destructive">{team.stats.losses}D</span>
                    {team.winrate > 0 && <span>· {team.winrate}% WR</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-primary">{team.elo}</p>
                  <p className="text-[10px] text-muted-foreground">ELO</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* === BARES === */}
      {tab === 'bares' && (
        <div className="flex flex-col gap-2.5">
          {venueRankings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay bares con actividad.</p>}
          {venueRankings.map((v, i) => (
            <Link key={v.venueId} to={`/locales/${v.venueId}`}>
              <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card hover:shadow-elevated transition-shadow border border-border/30">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{v.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />{v.city}
                    <span>· {v.tournamentCount} torneos</span>
                    <span>· {v.playerCount} jugadores</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-primary">{v.avgElo || '—'}</p>
                  <p className="text-[10px] text-muted-foreground">ELO medio</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
