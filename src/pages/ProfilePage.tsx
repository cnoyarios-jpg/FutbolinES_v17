import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import {
  MOCK_USER, MOCK_RANKINGS, MOCK_TEAMS, MOCK_PAIRS, MOCK_TOURNAMENTS,
  getCurrentUser, updateUserPreferences, getFrequentPartners, getPairHistory,
  getRegisteredUsers, getEloHistory, ensureEloHistory, getPlayerRivalries,
  getActivityLog, getNotifications,
} from '@/data/mock';
import { Settings, Trophy, Shield, Target, Users, ArrowLeft, LogOut, Star, Flame, X, Handshake, Award, Bell, Swords, Activity, Sun, Moon } from 'lucide-react';
import { Position, TableBrand } from '@/types';
import { toast } from 'sonner';
import AchievementsSection from '@/components/AchievementsSection';
import { useTheme } from '@/hooks/use-theme';
import MvpHistorySection from '@/components/MvpHistorySection';
import { getDivision } from '@/lib/divisions';
import { DivisionIcon } from '@/components/DivisionBadge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];

interface ProfilePageProps {
  onLogout?: () => void;
}

export default function ProfilePage({ onLogout }: ProfilePageProps) {
  const { userId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [eloTimeFilter, setEloTimeFilter] = useState<'7d' | '30d' | '3m' | 'all'>('3m');
  const [eloPositionFilter, setEloPositionFilter] = useState<'general' | 'portero' | 'delantero'>('general');
  const [showBreakdown, setShowBreakdown] = useState(false);
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

  // General ELO is now tracked independently (layered system)
  const division = rating ? getDivision(rating.general) : null;
  const teams = MOCK_TEAMS.filter(t => t.captainId === targetUserId);
  const winrate = rating && (rating.wins + rating.losses > 0) ? Math.round((rating.wins / (rating.wins + rating.losses)) * 100) : 0;
  const sortedRankings = [...MOCK_RANKINGS].sort((a, b) => b.general - a.general);
  const rankPosition = sortedRankings.findIndex(r => r.userId === targetUserId) + 1;
  const partners = getFrequentPartners(targetUserId);
  const topPartner = partners.length > 0 ? partners[0] : null;
  const pairHistory = getPairHistory(targetUserId);

  const bestTable = rating?.byTable ? Object.entries(rating.byTable).sort(([,a],[,b]) => (b||0) - (a||0))[0] : null;
  const bestStyle = rating ? (rating.byStyle.parado >= rating.byStyle.movimiento ? 'Parado' : 'Movimiento') : null;
  const bestPosition = rating ? (rating.asGoalkeeper >= rating.asForward ? 'Portero' : 'Delantero') : null;

  const wonTournaments = MOCK_TOURNAMENTS.filter(t => {
    if (t.status !== 'finalizado') return false;
    const tPairs = MOCK_PAIRS.filter(p => p.tournamentId === t.id && p.status === 'ganadora');
    return tPairs.some(p => p.goalkeeper.userId === targetUserId || p.forward.userId === targetUserId);
  });

  // ELO history with real day aggregation (7d / 30d / 3m / all)
  ensureEloHistory(targetUserId);
  const eloChartData = useMemo(() => {
    const history = getEloHistory(targetUserId);
    const dayRanges: Record<'7d' | '30d' | '3m' | 'all', number | null> = {
      '7d': 7,
      '30d': 30,
      '3m': 90,
      'all': null,
    };

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
      const currentElo =
        eloPositionFilter === 'portero'
          ? rating.asGoalkeeper
          : eloPositionFilter === 'delantero'
            ? rating.asForward
            : rating.general;

      return [{
        date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        elo: currentElo,
      }];
    }

    return aggregated.map(e => ({
      date: new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      elo: e.elo,
    }));
  }, [targetUserId, eloTimeFilter, eloPositionFilter, rating]);

  // Rivalries & Activity
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

  return (
    <PageShell>
      {!isOwnProfile && (
        <div className="mb-4">
          <Link to="/ranking" className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition active:scale-95">
            <ArrowLeft className="h-4 w-4" /> Volver al ranking
          </Link>
        </div>
      )}

      {/* Quick links for own profile */}
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
            <button onClick={() => { setEditPosition(currentUser?.preferredPosition || 'portero'); setEditStyle(currentUser?.preferredStyle || 'parado'); setEditTable(currentUser?.preferredTable || 'Presas'); setShowEditDialog(true); }} className="rounded-lg bg-muted p-2"><Settings className="h-5 w-5 text-muted-foreground" /></button>
            {onLogout && <button onClick={onLogout} className="rounded-lg bg-destructive/10 p-2"><LogOut className="h-5 w-5 text-destructive" /></button>}
          </div>
        )}
      </div>

      {/* ELO Cards - clickable to show breakdown */}
      {rating && (
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-3 cursor-pointer" onClick={() => setShowBreakdown(!showBreakdown)}>
            <div className="rounded-xl bg-card p-3 shadow-card text-center hover:ring-1 hover:ring-primary/30 transition">
              <Trophy className="h-4 w-4 mx-auto text-accent" />
              <p className="mt-1 font-display text-lg font-bold">{rating.general}</p>
              <p className="text-[10px] text-muted-foreground">ELO General</p>
            </div>
            <div className="rounded-xl bg-card p-3 shadow-card text-center hover:ring-1 hover:ring-primary/30 transition">
              <Shield className="h-4 w-4 mx-auto text-primary" />
              <p className="mt-1 font-display text-lg font-bold">{rating.asGoalkeeper}</p>
              <p className="text-[10px] text-muted-foreground">Portero</p>
            </div>
            <div className="rounded-xl bg-card p-3 shadow-card text-center hover:ring-1 hover:ring-primary/30 transition">
              <Target className="h-4 w-4 mx-auto text-secondary" />
              <p className="mt-1 font-display text-lg font-bold">{rating.asForward}</p>
              <p className="text-[10px] text-muted-foreground">Delantero</p>
            </div>
          </div>
          {!showBreakdown && <p className="text-[9px] text-muted-foreground text-center mt-1">Toca para ver desglose</p>}

          {/* Rating Breakdown Panel */}
          {showBreakdown && (
            <div className="mt-3 rounded-xl bg-card p-4 shadow-card animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold">⚡ Desglose de Rating</h3>
                <button onClick={(e) => { e.stopPropagation(); setShowBreakdown(false); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3 text-xs">
                {/* Mode Adjustments */}
                <div>
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-1.5">Ajuste por Modo (±180 máx)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(rating.byStyle).map(([mode, adj]) => (
                      <div key={mode} className="rounded-lg bg-muted p-2 flex justify-between items-center">
                        <span className="capitalize font-medium">{mode}</span>
                        <span className={`font-bold ${(adj as number) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {(adj as number) >= 0 ? '+' : ''}{adj}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Table Adjustments */}
                <div>
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-1.5">Ajuste por Mesa (±90 máx)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(rating.byTable).filter(([,v]) => v !== undefined && v !== 0).map(([table, adj]) => (
                      <div key={table} className="rounded-lg bg-muted p-2 flex justify-between items-center">
                        <span className="font-medium">{table}</span>
                        <span className={`font-bold ${(adj as number || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {(adj as number || 0) >= 0 ? '+' : ''}{adj}
                        </span>
                      </div>
                    ))}
                    {Object.entries(rating.byTable).filter(([,v]) => v !== undefined && v !== 0).length === 0 && (
                      <p className="text-muted-foreground col-span-2 italic">Sin datos de mesa</p>
                    )}
                  </div>
                </div>
                {/* Effective Rating Formula */}
                <div className="rounded-lg bg-primary/5 p-2.5 border border-primary/10">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Fórmula Rating Efectivo</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-mono">0.6 × ELO posición + 0.4 × ELO general + ajuste modo + ajuste mesa</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 italic">
                    Ajustes son modificadores pequeños (modo ±180, mesa ±90), NO ratings completos. Cap total: ±120.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                    {(['parado', 'movimiento'] as const).map(style => (
                      <div key={`eff-gk-${style}`} className="rounded bg-muted px-2 py-1">
                        <span className="text-muted-foreground">Portero/{style}: </span>
                        <span className="font-bold">
                          {Math.round(0.6 * rating.asGoalkeeper + 0.4 * rating.general + Math.max(-120, Math.min(120, (rating.byStyle[style] || 0))))}
                        </span>
                      </div>
                    ))}
                    {(['parado', 'movimiento'] as const).map(style => (
                      <div key={`eff-fw-${style}`} className="rounded bg-muted px-2 py-1">
                        <span className="text-muted-foreground">Delantero/{style}: </span>
                        <span className="font-bold">
                          {Math.round(0.6 * rating.asForward + 0.4 * rating.general + Math.max(-120, Math.min(120, (rating.byStyle[style] || 0))))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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
          {/* Position filter */}
          <div className="flex gap-1 mb-3">
            {([
              { key: 'general' as const, label: 'General', icon: '📊' },
              { key: 'portero' as const, label: 'Portero', icon: '🧤' },
              { key: 'delantero' as const, label: 'Delantero', icon: '⚽' },
            ]).map(({ key, label, icon }) => (
              <button key={key} onClick={() => setEloPositionFilter(key)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition ${eloPositionFilter === key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {icon} {label}
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
                <Line
                  type="monotone"
                  dataKey="elo"
                  stroke={eloPositionFilter === 'portero' ? 'hsl(var(--primary))' : eloPositionFilter === 'delantero' ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 3 }}
                  name={eloPositionFilter === 'portero' ? 'ELO Portero' : eloPositionFilter === 'delantero' ? 'ELO Delantero' : 'ELO General'}
                />
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

      {/* Achievements */}
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
            {bestPosition && <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Mejor posición</p><p className="font-semibold">{bestPosition}</p></div>}
            {bestStyle && <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Mejor modo</p><p className="font-semibold">{bestStyle}</p></div>}
            {bestTable && <div className="rounded-lg bg-muted p-2.5 col-span-2"><p className="text-muted-foreground">Mejor mesa</p><p className="font-semibold">{bestTable[0]} (ELO: {bestTable[1]})</p></div>}
            {topPartner && <div className="rounded-lg bg-muted p-2.5 col-span-2"><p className="text-muted-foreground">Compañero/a más frecuente</p><p className="font-semibold">{topPartner.partnerName} ({topPartner.count} veces)</p></div>}
          </div>
        </div>
      )}

      {/* Rivalries - now with win/loss counts */}
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

      {/* MVP History */}
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
