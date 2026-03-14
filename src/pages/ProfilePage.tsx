import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import {
  MOCK_USER, MOCK_RANKINGS, MOCK_TEAMS, MOCK_PAIRS, MOCK_TOURNAMENTS,
  getCurrentUser, updateUserPreferences, getFrequentPartners, getPairHistory,
  getRegisteredUsers, getEloHistory, ensureEloHistory, getPlayerRivalries,
  getActivityLog, getNotifications, getContextStats,
} from '@/data/mock';
import { Settings, Trophy, Shield, Target, Users, ArrowLeft, LogOut, Star, Flame, X, Handshake, Award, Bell, Swords, Activity, Sun, Moon } from 'lucide-react';
import { Position, TableBrand } from '@/types';
import { toast } from 'sonner';
import AchievementsSection from '@/components/AchievementsSection';
import { useTheme } from '@/hooks/use-theme';
import MvpHistorySection from '@/components/MvpHistorySection';
import { getDivision } from '@/lib/divisions';
import { DivisionIcon } from '@/components/DivisionBadge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];

type EloFilter = 'general' | 'portero_parado' | 'portero_movimiento' | 'delantero_parado' | 'delantero_movimiento';

interface ProfilePageProps {
  onLogout?: () => void;
}

export default function ProfilePage({ onLogout }: ProfilePageProps) {
  const { userId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [eloTimeFilter, setEloTimeFilter] = useState<'7d' | '30d' | '3m' | 'all'>('3m');
  const [eloPositionFilter, setEloPositionFilter] = useState<EloFilter>('general');
  const [, forceUpdate] = useState(0);

  const isOwnProfile = !userId;
  const currentUser = getCurrentUser();

  let rating: typeof MOCK_RANKINGS[0] | undefined;
  let displayName: string;
  let city: string;
  let postalCode: string | undefined;
  let preferredPosition: string | undefined;
  let preferredStyle: string | undefined;
  let preferredTable: string | undefined;
  let playerType: string | undefined;
  const targetUserId = userId || currentUser?.id || MOCK_USER.id;

  if (userId) {
    rating = MOCK_RANKINGS.find(r => r.userId === userId);
    displayName = rating?.displayName || 'Usuario';
    city = rating?.city || '';
    postalCode = rating?.postalCode;
    preferredPosition = rating?.preferredPosition;
    preferredStyle = rating?.preferredStyle;
    preferredTable = rating?.preferredTable;
    playerType = rating?.playerType;
    if (!preferredPosition) {
      const regUser = getRegisteredUsers().find(u => u.id === userId);
      if (regUser) {
        preferredPosition = regUser.preferredPosition;
        preferredStyle = regUser.preferredStyle;
        preferredTable = regUser.preferredTable;
        postalCode = regUser.postalCode;
        playerType = regUser.playerType;
      }
    }
  } else {
    const user = currentUser ? { ...MOCK_USER, id: currentUser.id, displayName: currentUser.displayName, city: currentUser.city, postalCode: currentUser.postalCode, preferredPosition: currentUser.preferredPosition, preferredStyle: currentUser.preferredStyle, preferredTable: currentUser.preferredTable, playerType: currentUser.playerType } : MOCK_USER;
    rating = MOCK_RANKINGS.find(r => r.userId === user.id);
    displayName = user.displayName;
    city = user.city || '';
    postalCode = user.postalCode;
    preferredPosition = user.preferredPosition;
    preferredStyle = user.preferredStyle;
    preferredTable = user.preferredTable;
    playerType = user.playerType;
  }

  // 5-ELO model
  const gkStill = rating?.goalkeeperStill ?? rating?.asGoalkeeper ?? 0;
  const gkMoving = rating?.goalkeeperMoving ?? rating?.asGoalkeeper ?? 0;
  const fwStill = rating?.forwardStill ?? rating?.asForward ?? 0;
  const fwMoving = rating?.forwardMoving ?? rating?.asForward ?? 0;
  const generalElo = rating ? Math.round((gkStill + gkMoving + fwStill + fwMoving) / 4) : 0;

  const division = rating ? getDivision(generalElo) : null;
  const teams = MOCK_TEAMS.filter(t => t.captainId === targetUserId);
  const winrate = rating && (rating.wins + rating.losses > 0) ? Math.round((rating.wins / (rating.wins + rating.losses)) * 100) : 0;
  const sortedRankings = [...MOCK_RANKINGS].sort((a, b) => b.general - a.general);
  const rankPosition = sortedRankings.findIndex(r => r.userId === targetUserId) + 1;
  const partners = getFrequentPartners(targetUserId);
  const topPartner = partners.length > 0 ? partners[0] : null;
  const pairHistory = getPairHistory(targetUserId);
  const contextStats = getContextStats(targetUserId);

  const wonTournaments = MOCK_TOURNAMENTS.filter(t => {
    if (t.status !== 'finalizado') return false;
    const tPairs = MOCK_PAIRS.filter(p => p.tournamentId === t.id && p.status === 'ganadora');
    return tPairs.some(p => p.goalkeeper.userId === targetUserId || p.forward.userId === targetUserId);
  });

  // ELO history
  ensureEloHistory(targetUserId);
  const eloChartData = useMemo(() => {
    const history = getEloHistory(targetUserId);
    const dayRanges: Record<string, number | null> = { '7d': 7, '30d': 30, '3m': 90, 'all': null };
    const rangeDays = dayRanges[eloTimeFilter];
    const startDate = (() => {
      if (rangeDays === null) return null;
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (rangeDays - 1));
      return date.getTime();
    })();

    const positionHistory = history
      .filter(e => (e.position || 'general') === eloPositionFilter)
      .filter(e => startDate === null || new Date(e.date).getTime() >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const lastPerDay = new Map<string, { date: string; elo: number }>();
    positionHistory.forEach(entry => {
      const dayKey = new Date(entry.date).toISOString().slice(0, 10);
      lastPerDay.set(dayKey, { date: entry.date, elo: entry.elo });
    });

    const aggregated = Array.from(lastPerDay.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (aggregated.length === 0 && rating) {
      const currentElo = eloPositionFilter === 'general' ? generalElo
        : eloPositionFilter === 'portero_parado' ? gkStill
        : eloPositionFilter === 'portero_movimiento' ? gkMoving
        : eloPositionFilter === 'delantero_parado' ? fwStill
        : fwMoving;
      return [{ date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), elo: currentElo }];
    }

    return aggregated.map(e => ({
      date: new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      elo: e.elo,
    }));
  }, [targetUserId, eloTimeFilter, eloPositionFilter, rating]);

  const rivalries = getPlayerRivalries(targetUserId);
  const activityLog = getActivityLog(targetUserId);
  const unreadNotifs = isOwnProfile && currentUser ? getNotifications(currentUser.id).filter(n => !n.read).length : 0;

  const [editPosition, setEditPosition] = useState<Position>(currentUser?.preferredPosition || 'portero');
  const [editStyle, setEditStyle] = useState<'parado' | 'movimiento'>(currentUser?.preferredStyle || 'parado');
  const [editTable, setEditTable] = useState<TableBrand>(currentUser?.preferredTable || 'Presas');

  const handleSavePreferences = () => {
    updateUserPreferences({ preferredPosition: editPosition, preferredStyle: editStyle, preferredTable: editTable });
    toast.success('Preferencias actualizadas');
    setShowEditDialog(false);
    forceUpdate(n => n + 1);
  };

  const activityIcons: Record<string, string> = {
    match_win: '✅', match_loss: '❌', tournament_win: '🏆', mvp: '⭐', division_up: '📈', division_down: '📉',
  };

  const eloFilterLabels: Record<EloFilter, string> = {
    general: '📊 General',
    portero_parado: '🧤🧱 P. Parado',
    portero_movimiento: '🧤💨 P. Movimiento',
    delantero_parado: '⚽🧱 D. Parado',
    delantero_movimiento: '⚽💨 D. Movimiento',
  };

  return (
    <PageShell>
      {!isOwnProfile && (
        <div className="mb-4">
          <Link to="/ranking" className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition active:scale-95">
            <ArrowLeft className="h-4 w-4" /> Volver al ranking
          </Link>
        </div>
      )}

      {isOwnProfile && (
        <div className="flex gap-2 mb-4">
          <Link to="/mi-equipo" className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Mi equipo
          </Link>
          <Link to="/notificaciones" className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground relative">
            <Bell className="h-3.5 w-3.5" /> Notificaciones
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">{unreadNotifs}</span>
            )}
          </Link>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-bold text-primary">
            {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{city}{postalCode ? ` · CP ${postalCode}` : ''}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {rankPosition > 0 && <p className="text-xs text-primary font-semibold">#{rankPosition}</p>}
              {division && (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${division.bgClass} ${division.colorClass} border-current/20`}>
                  <DivisionIcon iconName={division.iconName} className="h-3.5 w-3.5" /> {division.fullName}
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-1.5 flex-wrap">
              {playerType && <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${playerType === 'registrado' ? 'bg-success/10 text-success' : 'bg-warning/20 text-warning-foreground'}`}>{playerType === 'registrado' ? '✓ Registrado' : '👤 Invitado'}</span>}
              {preferredPosition && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">{preferredPosition}</span>}
              {preferredStyle && <span className="rounded-md bg-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground capitalize">{preferredStyle}</span>}
              {preferredTable && <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary capitalize">{preferredTable}</span>}
            </div>
          </div>
        </div>
        {isOwnProfile && (
          <div className="flex gap-1.5">
            <button onClick={toggleTheme} className="rounded-lg bg-muted p-2" title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
              {theme === 'dark' ? <Sun className="h-5 w-5 text-accent" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </button>
            <button onClick={() => { setEditPosition(currentUser?.preferredPosition || 'portero'); setEditStyle(currentUser?.preferredStyle || 'parado'); setEditTable(currentUser?.preferredTable || 'Presas'); setShowEditDialog(true); }} className="rounded-lg bg-muted p-2"><Settings className="h-5 w-5 text-muted-foreground" /></button>
            {onLogout && <button onClick={onLogout} className="rounded-lg bg-destructive/10 p-2"><LogOut className="h-5 w-5 text-destructive" /></button>}
          </div>
        )}
      </div>

      {/* 5 ELO Cards */}
      {rating && (
        <div className="mt-6">
          {/* General ELO big card */}
          <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 p-4 text-center border border-accent/10 mb-3">
            <Trophy className="h-5 w-5 mx-auto text-accent" />
            <p className="mt-1 font-display text-3xl font-bold">{generalElo}</p>
            <p className="text-[10px] text-muted-foreground font-medium">ELO General</p>
            <p className="text-[8px] text-muted-foreground mt-0.5">= media de los 4 ELO específicos</p>
          </div>

          {/* 4 specific ELOs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3 text-center border border-primary/10">
              <p className="text-[10px] text-muted-foreground font-semibold">🧤🧱 Portero Parado</p>
              <p className="font-display text-xl font-bold mt-1">{gkStill}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-3 text-center border border-primary/10">
              <p className="text-[10px] text-muted-foreground font-semibold">🧤💨 Portero Movimiento</p>
              <p className="font-display text-xl font-bold mt-1">{gkMoving}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 p-3 text-center border border-secondary/10">
              <p className="text-[10px] text-muted-foreground font-semibold">⚽🧱 Delantero Parado</p>
              <p className="font-display text-xl font-bold mt-1">{fwStill}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 p-3 text-center border border-secondary/10">
              <p className="text-[10px] text-muted-foreground font-semibold">⚽💨 Delantero Movimiento</p>
              <p className="font-display text-xl font-bold mt-1">{fwMoving}</p>
            </div>
          </div>
        </div>
      )}

      {/* ELO Evolution Chart */}
      {eloChartData.length > 0 && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">📈 Evolución ELO</h3>
            <div className="flex gap-1">
              {(['7d', '30d', '3m', 'all'] as const).map(f => (
                <button key={f} onClick={() => setEloTimeFilter(f)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${eloTimeFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {f === '7d' ? '7D' : f === '30d' ? '30D' : f === '3m' ? '3M' : 'Todo'}
                </button>
              ))}
            </div>
          </div>
          {/* 5 ELO filter */}
          <div className="flex flex-wrap gap-1 mb-3">
            {(Object.entries(eloFilterLabels) as [EloFilter, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setEloPositionFilter(key)}
                className={`rounded px-2 py-0.5 text-[9px] font-medium transition ${eloPositionFilter === key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eloChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={['dataMin - 20', 'dataMax + 20']} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={35} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="elo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 3 }}
                  name={eloFilterLabels[eloPositionFilter]} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Win/Loss Stats */}
      {rating && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div><p className="font-display text-xl font-bold text-success">{rating.wins}</p><p className="text-[10px] text-muted-foreground">Victorias</p></div>
            <div><p className="font-display text-xl font-bold text-destructive">{rating.losses}</p><p className="text-[10px] text-muted-foreground">Derrotas</p></div>
            <div><p className="font-display text-xl font-bold">{winrate}%</p><p className="text-[10px] text-muted-foreground">Win Rate</p></div>
            <div><p className="font-display text-xl font-bold text-primary">{rating.tournamentsPlayed}</p><p className="text-[10px] text-muted-foreground">Torneos</p></div>
          </div>
        </div>
      )}

      <AchievementsSection userId={targetUserId} />

      {/* Advanced Stats */}
      {rating && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5"><Star className="h-4 w-4 text-accent" /> Estadísticas avanzadas</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-muted-foreground">Torneos ganados</p>
              <p className="font-display text-lg font-bold">{rating.tournamentsWon}</p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-muted-foreground">Jugador del torneo</p>
              <p className="font-display text-lg font-bold flex items-center gap-1"><Award className="h-4 w-4 text-accent" />{rating.mvpCount || 0}</p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-muted-foreground">Racha actual</p>
              <p className="font-display text-lg font-bold flex items-center gap-1"><Flame className="h-4 w-4 text-secondary" />{rating.currentStreak || 0}</p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-muted-foreground">Mejor racha</p>
              <p className="font-display text-lg font-bold">{rating.bestStreak || 0}</p>
            </div>
            {(() => {
              const modes = Object.entries(contextStats.byMode);
              if (modes.length === 0) return null;
              const best = modes.sort(([,a],[,b]) => (b.matches > 0 ? b.wins/b.matches : 0) - (a.matches > 0 ? a.wins/a.matches : 0))[0];
              return <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Mejor modo</p><p className="font-semibold capitalize">{best[0]}</p></div>;
            })()}
            {(() => {
              const tables = Object.entries(contextStats.byTable);
              if (tables.length === 0) return null;
              const best = tables.sort(([,a],[,b]) => (b.matches > 0 ? b.wins/b.matches : 0) - (a.matches > 0 ? a.wins/a.matches : 0))[0];
              const wr = best[1].matches > 0 ? Math.round((best[1].wins / best[1].matches) * 100) : 0;
              return <div className="rounded-lg bg-muted p-2.5 col-span-2"><p className="text-muted-foreground">Mejor mesa</p><p className="font-semibold">{best[0]} ({wr}% WR)</p></div>;
            })()}
            {topPartner && <div className="rounded-lg bg-muted p-2.5 col-span-2"><p className="text-muted-foreground">Compañero/a más frecuente</p><p className="font-semibold">{topPartner.partnerName} ({topPartner.count} veces)</p></div>}
          </div>
        </div>
      )}

      {/* Rivalries */}
      {rivalries.length > 0 && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-destructive" /> Rivalidades
          </h3>
          <div className="flex flex-col gap-2">
            {rivalries.map((r, i) => (
              <Link key={r.opponentId} to={`/perfil/${r.opponentId}`} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs hover:bg-muted/80 transition">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="font-semibold">{r.opponentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{r.encounters} enfrentamientos</span>
                  <span className="text-success font-semibold">{r.wins}V</span>
                  <span className="text-destructive font-semibold">{r.losses}D</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activityLog.length > 0 && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" /> Actividad reciente
          </h3>
          <div className="flex flex-col gap-1.5">
            {activityLog.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span>{activityIcons[a.type] || '📌'}</span>
                  <span className="text-muted-foreground">{a.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  {a.eloChange != null && (
                    <span className={`font-bold ${a.eloChange > 0 ? 'text-success' : 'text-destructive'}`}>
                      {a.eloChange > 0 ? '+' : ''}{a.eloChange}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pair History */}
      {pairHistory.length > 0 && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5"><Handshake className="h-4 w-4 text-primary" /> Historial de parejas</h3>
          <div className="flex flex-col gap-2">
            {pairHistory.map((ph, i) => {
              const partnerName = ph.goalkeeperId === targetUserId ? ph.forwardName : ph.goalkeeperName;
              const wr = ph.matchesPlayed > 0 ? Math.round((ph.wins / ph.matchesPlayed) * 100) : 0;
              return (
                <div key={i} className="rounded-lg bg-muted p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{partnerName}</span>
                    <span className="text-muted-foreground">{ph.matchesPlayed} partidos</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-muted-foreground">
                    <span className="text-success">{ph.wins}V</span>
                    <span className="text-destructive">{ph.losses}D</span>
                    <span>{wr}% WR</span>
                    {ph.tournamentsWon > 0 && <span className="text-accent-foreground">🏆 {ph.tournamentsWon}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MvpHistorySection userId={targetUserId} />

      {/* Teams */}
      {teams.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold flex items-center gap-1.5"><Users className="h-4 w-4" /> {isOwnProfile ? 'Mis equipos' : 'Equipos'}</h2>
            <Link to="/equipos" className="text-xs font-semibold text-primary">Ver todos</Link>
          </div>
          <div className="flex flex-col gap-2">
            {teams.map(team => (
              <div key={team.id} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{team.name}</p><p className="text-xs text-muted-foreground">{team.city}</p></div>
                <p className="font-display text-lg font-bold text-primary">{team.elo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Editar preferencias</h3>
              <button onClick={() => setShowEditDialog(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Posición preferida</label>
                <div className="flex gap-2">
                  {(['portero', 'delantero'] as Position[]).map(p => (
                    <button key={p} onClick={() => setEditPosition(p)}
                      className={`flex-1 rounded-lg border p-2 text-center text-xs font-semibold capitalize transition ${editPosition === p ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Estilo de juego</label>
                <div className="flex gap-2">
                  {(['parado', 'movimiento'] as const).map(s => (
                    <button key={s} onClick={() => setEditStyle(s)}
                      className={`flex-1 rounded-lg border p-2 text-center text-xs font-semibold capitalize transition ${editStyle === s ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Mesa preferida</label>
                <div className="flex flex-wrap gap-1.5">
                  {TABLE_BRANDS.map(brand => (
                    <button key={brand} onClick={() => setEditTable(brand)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${editTable === brand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{brand}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowEditDialog(false)} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleSavePreferences} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
