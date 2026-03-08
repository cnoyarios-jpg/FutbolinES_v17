import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_RANKINGS, MOCK_TEAMS, MOCK_VENUES, MOCK_TOURNAMENTS, MOCK_PAIRS, getAllPairRankings, getVenueRankings, getTeamStats, isGuestPlayer } from '@/data/mock';
import { Trophy, Shield, Target, Users, Handshake, MapPin, Search, Filter, X } from 'lucide-react';
import { TableBrand } from '@/types';

type RankingTab = 'individual' | 'parejas' | 'equipos' | 'bares';
type RankingView = 'general' | 'porteros' | 'delanteros';

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];

export default function RankingsPage() {
  const [tab, setTab] = useState<RankingTab>('individual');
  const [view, setView] = useState<RankingView>('general');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterPostalCode, setFilterPostalCode] = useState('');
  const [filterVenue, setFilterVenue] = useState<string>('');

  const hasActiveFilters = filterPosition || filterTable || filterPostalCode || filterVenue;

  const clearFilters = () => {
    setFilterPosition('');
    setFilterTable('');
    setFilterPostalCode('');
    setFilterVenue('');
  };

  // Get venue player IDs for venue filter
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

  // Apply filters
  let filtered = registeredOnly;
  if (filterPosition) {
    filtered = filtered.filter(r => r.preferredPosition === filterPosition);
  }
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

  const sorted = [...filtered].sort((a, b) => {
    if (view === 'porteros') return b.asGoalkeeper - a.asGoalkeeper;
    if (view === 'delanteros') return b.asForward - a.asForward;
    return b.general - a.general;
  });

  const getElo = (player: typeof sorted[0]) => {
    if (view === 'porteros') return player.asGoalkeeper;
    if (view === 'delanteros') return player.asForward;
    return player.general;
  };

  const pairRankings = getAllPairRankings();
  const venueRankings = getVenueRankings();
  const teamsSorted = [...MOCK_TEAMS].sort((a, b) => b.elo - a.elo);
  const activeVenues = MOCK_VENUES.filter(v => v.status === 'activo');

  return (
    <PageShell title="Ranking">
      {/* Tab selector */}
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {([
          { key: 'individual' as const, label: 'Individual', icon: Trophy },
          { key: 'parejas' as const, label: 'Parejas', icon: Handshake },
          { key: 'equipos' as const, label: 'Equipos', icon: Users },
          { key: 'bares' as const, label: 'Bares', icon: MapPin },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition whitespace-nowrap ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* === INDIVIDUAL === */}
      {tab === 'individual' && (
        <>
          <div className="mb-3 flex items-center gap-1.5">
            {([
              { key: 'general' as const, label: 'General', icon: Trophy },
              { key: 'porteros' as const, label: 'Porteros', icon: Shield },
              { key: 'delanteros' as const, label: 'Delanteros', icon: Target },
            ]).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setView(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${view === key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition ${showFilters || hasActiveFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Filter className="h-3.5 w-3.5" />
              {hasActiveFilters && <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[9px]">!</span>}
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mb-4 rounded-xl bg-card p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Filtros
                </h4>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                    <X className="h-3 w-3" /> Limpiar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Position filter */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Posición</label>
                  <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Todas</option>
                    <option value="portero">Portero</option>
                    <option value="delantero">Delantero</option>
                  </select>
                </div>
                {/* Table filter */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Mesa</label>
                  <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Todas</option>
                    {TABLE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {/* Postal code filter */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Código postal</label>
                  <input value={filterPostalCode} onChange={e => setFilterPostalCode(e.target.value)}
                    placeholder="Ej: 28"
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Venue filter */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Bar</label>
                  <select value={filterVenue} onChange={e => setFilterVenue(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
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

          <div className="flex flex-col gap-2">
            {sorted.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No se encontraron jugadores con estos filtros.</p>
            )}
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
        </>
      )}

      {/* === PAREJAS === */}
      {tab === 'parejas' && (
        <div className="flex flex-col gap-2">
          {pairRankings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay historial de parejas aún.</p>}
          {pairRankings.map((pr, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : i === 1 ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{pr.goalkeeperName} / {pr.forwardName}</p>
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
        <div className="flex flex-col gap-2">
          {teamsSorted.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay equipos registrados.</p>}
          {teamsSorted.map((team, i) => {
            const stats = getTeamStats(team.id);
            const wr = stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;
            return (
              <Link key={team.id} to={`/equipos/${team.id}`}>
                <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card hover:shadow-elevated transition-shadow">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{team.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />{team.city}
                      {stats.matchesPlayed > 0 && <span>· {wr}% WR</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-primary">{team.elo}</p>
                    <p className="text-[10px] text-muted-foreground">ELO</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* === BARES === */}
      {tab === 'bares' && (
        <div className="flex flex-col gap-2">
          {venueRankings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay bares con actividad.</p>}
          {venueRankings.map((v, i) => (
            <Link key={v.venueId} to={`/locales/${v.venueId}`}>
              <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card hover:shadow-elevated transition-shadow">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${i === 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{v.name}</p>
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
