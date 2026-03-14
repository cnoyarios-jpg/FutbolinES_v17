import { Venue, VenueTable, Tournament, PlayerRating, User, Team, TeamMember, TeamStats, TournamentPair, Position, TableCondition, TableBrand, Verification, VerificationType, AppNotification, PlayerType, Season, Achievement, AchievementId, PlayerAchievement, VenueLeague, ResultCorrection, TeamMatch, TeamMatchPairing, TeamLeague, TeamLeagueStanding, IndividualEnrollment } from '@/types';

// ===== AUTH STORE =====
export interface RegisteredUser {
  id: string;
  nickname: string;
  displayName: string;
  email: string;
  password: string;
  city: string;
  postalCode?: string;
  preferredPosition: Position;
  preferredStyle: 'parado' | 'movimiento';
  preferredTable?: TableBrand;
  playerType: PlayerType;
  createdAt: string;
}

const REGISTERED_USERS_KEY = 'futbolines_users';
const CURRENT_USER_KEY = 'futbolines_current_user';
const VERIFICATIONS_KEY = 'futbolines_verifications';
const TEAMS_STORAGE_KEY = 'futbolines_teams';
const TEAM_MEMBERS_KEY = 'futbolines_team_members';
const TEAM_STATS_KEY = 'futbolines_team_stats';
const NOTIFICATIONS_KEY = 'futbolines_notifications';
const PAIR_HISTORY_KEY = 'futbolines_pair_history';
const GUEST_PLAYERS_KEY = 'futbolines_guests';
const SEASONS_KEY = 'futbolines_seasons';
const ACHIEVEMENTS_KEY = 'futbolines_achievements';
const VENUE_LEAGUES_KEY = 'futbolines_venue_leagues';
const CORRECTIONS_KEY = 'futbolines_corrections';
const RANKINGS_OVERRIDES_KEY = 'futbolines_rankings_overrides';
const TOURNAMENTS_OVERRIDES_KEY = 'futbolines_tournaments_overrides';
const PAIRS_OVERRIDES_KEY = 'futbolines_pairs_overrides';
const TABLE_PERFORMANCE_KEY = 'futbolines_table_performance';
const CONTEXT_STATS_KEY = 'futbolines_context_stats';

// ===== POSTAL CODE → CITY MAPPING =====
const POSTAL_CITY_MAP: Record<string, string> = {
  '28': 'Madrid', '08': 'Barcelona', '48': 'Bilbao', '41': 'Sevilla',
  '46': 'Valencia', '29': 'Málaga', '50': 'Zaragoza', '15': 'A Coruña',
  '36': 'Vigo', '33': 'Oviedo', '18': 'Granada', '30': 'Murcia',
  '35': 'Las Palmas', '38': 'Tenerife', '07': 'Palma', '47': 'Valladolid',
  '01': 'Vitoria', '20': 'San Sebastián', '31': 'Pamplona', '39': 'Santander',
  '10': 'Cáceres', '06': 'Badajoz', '45': 'Toledo', '13': 'Ciudad Real',
  '02': 'Albacete', '16': 'Cuenca', '19': 'Guadalajara', '44': 'Teruel',
  '22': 'Huesca', '42': 'Soria', '40': 'Segovia', '05': 'Ávila',
  '49': 'Zamora', '34': 'Palencia', '09': 'Burgos', '24': 'León',
  '37': 'Salamanca', '26': 'Logroño', '11': 'Cádiz', '14': 'Córdoba',
  '23': 'Jaén', '04': 'Almería', '21': 'Huelva', '43': 'Tarragona',
  '25': 'Lleida', '17': 'Girona', '03': 'Alicante', '12': 'Castellón',
  '27': 'Lugo', '32': 'Ourense', '51': 'Ceuta', '52': 'Melilla',
};

export function getCityFromPostalCode(postalCode: string): string {
  if (!postalCode || postalCode.length < 2) return '';
  const prefix = postalCode.slice(0, 2);
  return POSTAL_CITY_MAP[prefix] || '';
}

export function getRegisteredUsers(): RegisteredUser[] {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY) || '[]');
  } catch { return []; }
}

function saveRegisteredUsers(users: RegisteredUser[]) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export function isNicknameAvailable(nickname: string): boolean {
  const users = getRegisteredUsers();
  return !users.some(u => u.nickname.toLowerCase() === nickname.toLowerCase());
}

export function isDisplayNameAvailable(displayName: string): boolean {
  const users = getRegisteredUsers();
  const inRegistered = users.some(u => u.displayName.toLowerCase() === displayName.toLowerCase());
  const inRankings = MOCK_RANKINGS.some(r => r.displayName.toLowerCase() === displayName.toLowerCase());
  return !inRegistered && !inRankings;
}

export function registerUser(data: Omit<RegisteredUser, 'id' | 'createdAt' | 'playerType'>): { success: boolean; error?: string; user?: RegisteredUser } {
  if (!isNicknameAvailable(data.nickname)) {
    return { success: false, error: 'Este nickname ya está en uso. Elige otro.' };
  }
  if (!isDisplayNameAvailable(data.displayName)) {
    return { success: false, error: 'Este nombre completo ya está registrado. Usa otro.' };
  }
  const users = getRegisteredUsers();
  if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
    return { success: false, error: 'Este email ya está registrado.' };
  }
  // Derive city from postal code if not provided
  const city = data.city || (data.postalCode ? getCityFromPostalCode(data.postalCode) : '');
  const newUser: RegisteredUser = {
    ...data,
    city,
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    playerType: 'registrado',
    createdAt: new Date().toISOString().split('T')[0],
  };
  users.push(newUser);
  saveRegisteredUsers(users);
  setCurrentUser(newUser);
  ensureRankingEntry(newUser.id, newUser.displayName, city, newUser.postalCode, newUser.preferredPosition, newUser.preferredStyle, newUser.preferredTable);
  return { success: true, user: newUser };
}

export function ensureRankingEntry(
  userId: string,
  displayName: string,
  city?: string,
  postalCode?: string,
  preferredPosition?: Position,
  preferredStyle?: 'parado' | 'movimiento',
  preferredTable?: TableBrand
) {
  const existing = MOCK_RANKINGS.find(r => r.userId === userId);
  // Derive city from postal code if missing
  const resolvedCity = city || (postalCode ? getCityFromPostalCode(postalCode) : '');
  if (!existing) {
    MOCK_RANKINGS.push({
      userId, displayName, city: resolvedCity, postalCode,
      general: 1500, asGoalkeeper: 1500, asForward: 1500,
      goalkeeperStill: 1500, goalkeeperMoving: 1500, forwardStill: 1500, forwardMoving: 1500,
      byTable: {}, byStyle: { parado: 0, movimiento: 0 },
      wins: 0, losses: 0, tournamentsPlayed: 0, tournamentsWon: 0,
      mvpCount: 0, currentStreak: 0, bestStreak: 0,
      preferredPosition, preferredStyle, preferredTable,
      playerType: 'registrado',
    });
    persistRankings();
  } else if (!existing.city && postalCode) {
    existing.city = getCityFromPostalCode(postalCode);
    persistRankings();
  }
}

export function loginUser(email: string, password: string): { success: boolean; error?: string; user?: RegisteredUser } {
  const users = getRegisteredUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { success: false, error: 'Email o contraseña incorrectos.' };
  // Derive city if missing
  if (!user.city && user.postalCode) {
    user.city = getCityFromPostalCode(user.postalCode);
    saveRegisteredUsers(users);
  }
  setCurrentUser(user);
  ensureRankingEntry(user.id, user.displayName, user.city, user.postalCode, user.preferredPosition, user.preferredStyle, user.preferredTable);
  return { success: true, user };
}

export function setCurrentUser(user: RegisteredUser | null) {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): RegisteredUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function updateUserPreferences(updates: { preferredPosition?: Position; preferredStyle?: 'parado' | 'movimiento'; preferredTable?: TableBrand }) {
  const current = getCurrentUser();
  if (!current) return;
  const updated = { ...current, ...updates };
  setCurrentUser(updated);
  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.id === current.id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    saveRegisteredUsers(users);
  }
  const ranking = MOCK_RANKINGS.find(r => r.userId === current.id);
  if (ranking) {
    if (updates.preferredPosition) ranking.preferredPosition = updates.preferredPosition;
    if (updates.preferredStyle) ranking.preferredStyle = updates.preferredStyle;
    if (updates.preferredTable) ranking.preferredTable = updates.preferredTable;
    persistRankings();
  }
}

// ===== GUEST PLAYERS =====

export interface GuestPlayer {
  id: string;
  displayName: string;
  postalCode?: string;
  playerType: 'invitado';
  createdAt: string;
}

export function getGuestPlayers(): GuestPlayer[] {
  try { return JSON.parse(localStorage.getItem(GUEST_PLAYERS_KEY) || '[]'); } catch { return []; }
}

function saveGuestPlayers(guests: GuestPlayer[]) {
  localStorage.setItem(GUEST_PLAYERS_KEY, JSON.stringify(guests));
}

export function createGuestPlayer(displayName: string, postalCode?: string): GuestPlayer {
  const guests = getGuestPlayers();
  const existing = guests.find(g => g.displayName.toLowerCase() === displayName.toLowerCase());
  if (existing) return existing;

  const guest: GuestPlayer = {
    id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    displayName, postalCode, playerType: 'invitado',
    createdAt: new Date().toISOString().split('T')[0],
  };
  guests.push(guest);
  saveGuestPlayers(guests);
  return guest;
}

export function isGuestPlayer(userId: string): boolean {
  return userId.startsWith('guest_');
}

// ===== VERIFICATIONS =====

export function getVenueVerifications(venueId: string): Verification[] {
  try {
    const all: Verification[] = JSON.parse(localStorage.getItem(VERIFICATIONS_KEY) || '[]');
    return all.filter(v => v.venueId === venueId);
  } catch { return []; }
}

function canUserVerifyVenue(userId: string, venueId: string): boolean {
  const verifications = getVenueVerifications(venueId);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return !verifications.some(v => v.userId === userId && new Date(v.createdAt).getTime() > oneWeekAgo);
}

export function verifyVenue(venueId: string, type: VerificationType = 'confirm', comment?: string): { success: boolean; error?: string; verification?: Verification } {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Debes iniciar sesión' };
  if (!canUserVerifyVenue(user.id, venueId)) {
    return { success: false, error: 'Solo puedes verificar un mismo local una vez por semana' };
  }
  const all: Verification[] = JSON.parse(localStorage.getItem(VERIFICATIONS_KEY) || '[]');
  const newVerification: Verification = {
    id: `ver_${Date.now()}`, venueId, userId: user.id, userName: user.displayName,
    type, comment, createdAt: new Date().toISOString(),
  };
  all.push(newVerification);
  localStorage.setItem(VERIFICATIONS_KEY, JSON.stringify(all));

  const venue = MOCK_VENUES.find(v => v.id === venueId);
  if (venue) {
    if (type === 'confirm') {
      venue.verificationCount = (venue.verificationCount || 0) + 1;
      venue.lastVerified = new Date().toISOString().split('T')[0];
      if (venue.verificationCount >= 3) venue.verificationLevel = 'verificado';
    } else if (type === 'report_worse') {
      const table = MOCK_TABLES.find(t => t.venueId === venueId);
      if (table) {
        const conditions: TableCondition[] = ['perfecta', 'buen_estado', 'estado_normal', 'deteriorada', 'fuera_de_servicio'];
        const idx = conditions.indexOf(table.condition);
        if (idx < conditions.length - 1) table.condition = conditions[idx + 1];
      }
      venue.verificationLevel = 'en_disputa';
    } else if (type === 'report_closed') {
      venue.status = 'cerrado';
    }
  }
  return { success: true, verification: newVerification };
}

// ===== NOTIFICATIONS =====

export function getNotifications(userId: string): AppNotification[] {
  try {
    const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    return all.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch { return []; }
}

export function addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  try {
    const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    all.push({ ...notification, id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, read: false, createdAt: new Date().toISOString() });
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
  } catch {}
}

export function markNotificationRead(notifId: string) {
  try {
    const all: AppNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    const n = all.find(x => x.id === notifId);
    if (n) n.read = true;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
  } catch {}
}

// ===== PAIR CONFIRMATION =====

export function confirmPairMembership(pairId: string, userId: string, accept: boolean) {
  const pair = MOCK_PAIRS.find(p => p.id === pairId);
  if (!pair) return;
  if (pair.goalkeeper.userId === userId) pair.goalkeeperConfirmed = accept ? 'aceptada' : 'rechazada';
  if (pair.forward.userId === userId) pair.forwardConfirmed = accept ? 'aceptada' : 'rechazada';
  if (pair.goalkeeperConfirmed === 'aceptada' && pair.forwardConfirmed === 'aceptada') pair.status = 'confirmada';
  persistPairs();
}

// ===== CHECK-IN =====

export function openCheckIn(tournamentId: string) {
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
  if (tournament) {
    tournament.checkInOpen = true;
    MOCK_PAIRS.filter(p => p.tournamentId === tournamentId).forEach(p => {
      if (!p.checkInStatus) p.checkInStatus = 'pendiente';
    });
  }
  persistTournaments();
  persistPairs();
}

export function closeCheckIn(tournamentId: string) {
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
  if (tournament) { tournament.checkInOpen = false; persistTournaments(); }
}

export function pairCheckIn(pairId: string) {
  const pair = MOCK_PAIRS.find(p => p.id === pairId);
  if (pair) { pair.checkInStatus = 'confirmado'; persistPairs(); }
}

export function markPairAbsent(pairId: string) {
  const pair = MOCK_PAIRS.find(p => p.id === pairId);
  if (pair) { pair.checkInStatus = 'ausente'; persistPairs(); }
}

export function removeAbsentPairs(tournamentId: string): number {
  let removed = 0;
  const indices: number[] = [];
  MOCK_PAIRS.forEach((p, i) => {
    if (p.tournamentId === tournamentId && p.checkInStatus === 'ausente') {
      indices.push(i);
      removed++;
    }
  });
  for (let i = indices.length - 1; i >= 0; i--) {
    MOCK_PAIRS.splice(indices[i], 1);
  }
  persistPairs();
  return removed;
}

// ===== TEAMS STORAGE =====

export function getStoredTeams(): Team[] {
  try { return JSON.parse(localStorage.getItem(TEAMS_STORAGE_KEY) || '[]'); } catch { return []; }
}

export function saveTeam(team: Team) {
  const teams = getStoredTeams();
  teams.push(team);
  localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  MOCK_TEAMS.push(team);
}

export function updateTeam(teamId: string, updates: Partial<Team>) {
  const teams = getStoredTeams();
  const idx = teams.findIndex(t => t.id === teamId);
  if (idx >= 0) {
    teams[idx] = { ...teams[idx], ...updates };
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  }
  const mockIdx = MOCK_TEAMS.findIndex(t => t.id === teamId);
  if (mockIdx >= 0) Object.assign(MOCK_TEAMS[mockIdx], updates);
}

export function deleteTeam(teamId: string) {
  const teams = getStoredTeams().filter(t => t.id !== teamId);
  localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  const idx = MOCK_TEAMS.findIndex(t => t.id === teamId);
  if (idx >= 0) MOCK_TEAMS.splice(idx, 1);
  const members: TeamMember[] = JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || '[]');
  localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(members.filter(m => m.teamId !== teamId)));
}

export function getTeamMembers(teamId: string): TeamMember[] {
  try {
    const all: TeamMember[] = JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || '[]');
    return all.filter(m => m.teamId === teamId);
  } catch { return []; }
}

export function addTeamMember(member: TeamMember) {
  try {
    const all: TeamMember[] = JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || '[]');
    if (all.some(m => m.teamId === member.teamId && m.userId === member.userId)) return;
    all.push(member);
    localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(all));
  } catch {}
}

export function respondTeamInvite(memberId: string, accept: boolean) {
  try {
    const all: TeamMember[] = JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || '[]');
    const m = all.find(x => x.id === memberId);
    if (m) m.status = accept ? 'aceptada' : 'rechazada';
    localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(all));
  } catch {}
}

export function getTeamStats(teamId: string): TeamStats {
  try {
    const all: TeamStats[] = JSON.parse(localStorage.getItem(TEAM_STATS_KEY) || '[]');
    return all.find(s => s.teamId === teamId) || { teamId, tournamentsPlayed: 0, tournamentsWon: 0, matchesPlayed: 0, wins: 0, losses: 0 };
  } catch {
    return { teamId, tournamentsPlayed: 0, tournamentsWon: 0, matchesPlayed: 0, wins: 0, losses: 0 };
  }
}

export function updateTeamStats(teamId: string, updates: Partial<TeamStats>) {
  try {
    const all: TeamStats[] = JSON.parse(localStorage.getItem(TEAM_STATS_KEY) || '[]');
    let existing = all.find(s => s.teamId === teamId);
    if (!existing) {
      existing = { teamId, tournamentsPlayed: 0, tournamentsWon: 0, matchesPlayed: 0, wins: 0, losses: 0 };
      all.push(existing);
    }
    Object.assign(existing, updates);
    localStorage.setItem(TEAM_STATS_KEY, JSON.stringify(all));
  } catch {}
}

// ===== MVP / JUGADOR DEL TORNEO =====

export function setTournamentMVP(tournamentId: string, playerId: string, playerName: string) {
  setTournamentMvp(tournamentId, playerId, playerName);
}

export function getTournamentMVPBonus(tournamentId: string): number {
  const pairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId);
  const allElos: number[] = [];
  pairs.forEach(p => { allElos.push(p.goalkeeper.elo, p.forward.elo); });
  const avgElo = allElos.length > 0 ? allElos.reduce((a, b) => a + b, 0) / allElos.length : 1500;
  return Math.min(Math.round(5 + Math.max(0, (avgElo - 1500)) * 0.02), 20);
}

// ===== TOURNAMENT WIN TRACKING =====

export function recordTournamentWin(tournamentId: string, winnerPairId: string) {
  const pair = MOCK_PAIRS.find(p => p.id === winnerPairId);
  if (!pair) return;

  [pair.goalkeeper.userId, pair.forward.userId].forEach(userId => {
    if (!isGuestPlayer(userId)) {
      const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
      if (ranking) {
        ranking.tournamentsWon = (ranking.tournamentsWon || 0) + 1;
        ranking.tournamentsPlayed = (ranking.tournamentsPlayed || 0) + 1;
        if (ranking.tournamentsWon >= 1) checkAndGrantAchievement(userId, 'first_tournament_win');
        if (ranking.tournamentsWon >= 5) checkAndGrantAchievement(userId, 'five_tournament_wins');
        if (ranking.tournamentsWon >= 10) checkAndGrantAchievement(userId, 'ten_tournament_wins');
      }
    }
  });

  const allPairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId && p.id !== winnerPairId);
  allPairs.forEach(p => {
    [p.goalkeeper.userId, p.forward.userId].forEach(userId => {
      if (!isGuestPlayer(userId)) {
        const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
        if (ranking) ranking.tournamentsPlayed = (ranking.tournamentsPlayed || 0) + 1;
      }
    });
  });

  recordPairHistory(pair.goalkeeper.userId, pair.goalkeeper.displayName, pair.forward.userId, pair.forward.displayName, true);
  persistRankings();
}

// ===== PAIR HISTORY =====

interface PairHistoryEntry {
  goalkeeperId: string;
  goalkeeperName: string;
  forwardId: string;
  forwardName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  tournamentsWon: number;
}

function getPairHistoryStore(): PairHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(PAIR_HISTORY_KEY) || '[]'); } catch { return []; }
}

function savePairHistoryStore(entries: PairHistoryEntry[]) {
  localStorage.setItem(PAIR_HISTORY_KEY, JSON.stringify(entries));
}

export function recordPairHistory(gkId: string, gkName: string, fwId: string, fwName: string, won: boolean) {
  const store = getPairHistoryStore();
  let entry = store.find(e => (e.goalkeeperId === gkId && e.forwardId === fwId) || (e.goalkeeperId === fwId && e.forwardId === gkId));
  if (!entry) {
    entry = { goalkeeperId: gkId, goalkeeperName: gkName, forwardId: fwId, forwardName: fwName, matchesPlayed: 0, wins: 0, losses: 0, tournamentsWon: 0 };
    store.push(entry);
  }
  entry.matchesPlayed++;
  if (won) { entry.wins++; entry.tournamentsWon++; } else { entry.losses++; }
  savePairHistoryStore(store);
}

export function getPairHistory(userId: string): PairHistoryEntry[] {
  const store = getPairHistoryStore();
  return store.filter(e => e.goalkeeperId === userId || e.forwardId === userId);
}

export function getAllPairRankings(): (PairHistoryEntry & { winrate: number; pairElo: number })[] {
  const store = getPairHistoryStore();
  return store
    .filter(e => e.matchesPlayed > 0)
    .map(e => {
      const gkR = MOCK_RANKINGS.find(r => r.userId === e.goalkeeperId);
      const fwR = MOCK_RANKINGS.find(r => r.userId === e.forwardId);
      const pairElo = Math.round(((gkR?.general || 1500) + (fwR?.general || 1500)) / 2);
      return { ...e, winrate: Math.round((e.wins / e.matchesPlayed) * 100), pairElo };
    })
    .sort((a, b) => b.pairElo - a.pairElo);
}

// ===== VENUE STATS =====

export function getVenueTopPlayers(venueId: string, limit: number = 3): { userId: string; displayName: string; elo: number }[] {
  const venueTournaments = MOCK_TOURNAMENTS.filter(t => t.venueId === venueId);
  const playerElos: Record<string, { displayName: string; elo: number }> = {};
  venueTournaments.forEach(t => {
    const pairs = MOCK_PAIRS.filter(p => p.tournamentId === t.id);
    pairs.forEach(p => {
      [p.goalkeeper, p.forward].forEach(member => {
        if (!isGuestPlayer(member.userId)) {
          const ranking = MOCK_RANKINGS.find(r => r.userId === member.userId);
          if (ranking && (!playerElos[member.userId] || ranking.general > playerElos[member.userId].elo)) {
            playerElos[member.userId] = { displayName: member.displayName, elo: ranking.general };
          }
        }
      });
    });
  });
  return Object.entries(playerElos).map(([userId, data]) => ({ userId, ...data })).sort((a, b) => b.elo - a.elo).slice(0, limit);
}

export function getVenueAvgLevel(venueId: string): number {
  const venueTournaments = MOCK_TOURNAMENTS.filter(t => t.venueId === venueId);
  const allElos: number[] = [];
  venueTournaments.forEach(t => {
    const pairs = MOCK_PAIRS.filter(p => p.tournamentId === t.id);
    pairs.forEach(p => {
      if (!isGuestPlayer(p.goalkeeper.userId)) {
        const gkR = MOCK_RANKINGS.find(r => r.userId === p.goalkeeper.userId);
        if (gkR) allElos.push(gkR.general);
      }
      if (!isGuestPlayer(p.forward.userId)) {
        const fwR = MOCK_RANKINGS.find(r => r.userId === p.forward.userId);
        if (fwR) allElos.push(fwR.general);
      }
    });
  });
  return allElos.length > 0 ? Math.round(allElos.reduce((a, b) => a + b, 0) / allElos.length) : 0;
}

export function getVenueMostCommonStyle(venueId: string): string | null {
  const venueTournaments = MOCK_TOURNAMENTS.filter(t => t.venueId === venueId);
  let parado = 0, movimiento = 0;
  venueTournaments.forEach(t => { if (t.playStyle === 'parado') parado++; else movimiento++; });
  if (parado === 0 && movimiento === 0) return null;
  return parado >= movimiento ? 'Parado' : 'Movimiento';
}

// ===== VENUE RANKINGS =====

export function getVenueRankings(): { venueId: string; name: string; city: string; avgElo: number; tournamentCount: number; playerCount: number }[] {
  return MOCK_VENUES
    .filter(v => v.status === 'activo')
    .map(v => {
      const tCount = MOCK_TOURNAMENTS.filter(t => t.venueId === v.id).length;
      const avgElo = getVenueAvgLevel(v.id);
      const playerIds = new Set<string>();
      MOCK_TOURNAMENTS.filter(t => t.venueId === v.id).forEach(t => {
        MOCK_PAIRS.filter(p => p.tournamentId === t.id).forEach(p => {
          if (!isGuestPlayer(p.goalkeeper.userId)) playerIds.add(p.goalkeeper.userId);
          if (!isGuestPlayer(p.forward.userId)) playerIds.add(p.forward.userId);
        });
      });
      return { venueId: v.id, name: v.name, city: v.city, avgElo, tournamentCount: tCount, playerCount: playerIds.size };
    })
    .sort((a, b) => b.avgElo - a.avgElo);
}

// ===== SEASONS =====

export function getSeasons(): Season[] {
  try { return JSON.parse(localStorage.getItem(SEASONS_KEY) || '[]'); } catch { return []; }
}

export function createSeason(name: string, startDate: string, endDate: string): Season {
  const seasons = getSeasons();
  seasons.forEach(s => s.isActive = false);
  const newSeason: Season = { id: `season_${Date.now()}`, name, startDate, endDate, isActive: true };
  seasons.push(newSeason);
  localStorage.setItem(SEASONS_KEY, JSON.stringify(seasons));
  return newSeason;
}

export function getActiveSeason(): Season | null {
  return getSeasons().find(s => s.isActive) || null;
}

// ===== ACHIEVEMENTS =====

import { TIERED_ACHIEVEMENTS, calculateLevel, PlayerTieredAchievement } from '@/types/achievements';

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first_tournament_win', name: 'Primera victoria', description: 'Gana tu primer torneo', icon: '🏆' },
  { id: 'five_tournament_wins', name: 'Pentacampeón', description: 'Gana 5 torneos', icon: '⭐' },
  { id: 'ten_tournament_wins', name: 'Leyenda', description: 'Gana 10 torneos', icon: '👑' },
  { id: 'ten_win_streak', name: 'Imparable', description: 'Racha de 10 victorias', icon: '🔥' },
  { id: 'mvp_tournament', name: 'MVP', description: 'Jugador del torneo', icon: '🌟' },
  { id: 'play_3_venues', name: 'Trotamundos', description: 'Juega en 3 locales diferentes', icon: '🗺️' },
  { id: 'play_5_tables', name: 'Polivalente', description: 'Juega en 5 mesas diferentes', icon: '🎯' },
];

// ===== FREQUENT PARTNERS =====

export function getFrequentPartners(userId: string): { partnerId: string; partnerName: string; count: number; wins: number; losses: number }[] {
  const partners: Record<string, { name: string; count: number; wins: number; losses: number }> = {};
  MOCK_PAIRS.forEach(pair => {
    if (pair.goalkeeper.userId === userId) {
      const p = pair.forward;
      if (!partners[p.userId]) partners[p.userId] = { name: p.displayName, count: 0, wins: 0, losses: 0 };
      partners[p.userId].count++;
      if (pair.status === 'ganadora') partners[p.userId].wins++;
      else if (pair.status === 'eliminada') partners[p.userId].losses++;
    } else if (pair.forward.userId === userId) {
      const p = pair.goalkeeper;
      if (!partners[p.userId]) partners[p.userId] = { name: p.displayName, count: 0, wins: 0, losses: 0 };
      partners[p.userId].count++;
      if (pair.status === 'ganadora') partners[p.userId].wins++;
      else if (pair.status === 'eliminada') partners[p.userId].losses++;
    }
  });
  return Object.entries(partners)
    .map(([partnerId, data]) => ({ partnerId, partnerName: data.name, count: data.count, wins: data.wins, losses: data.losses }))
    .sort((a, b) => b.count - a.count);
}

// ===== MVP RECORDS =====

export interface MvpRecord {
  tournamentId: string;
  tournamentName: string;
  date: string;
  venueName?: string;
  format?: string;
  avgElo?: number;
}

function getMvpRecordsStore(): Record<string, MvpRecord[]> {
  try {
    return JSON.parse(localStorage.getItem('futbolines_mvp_records') || '{}');
  } catch { return {}; }
}

function saveMvpRecordsStore(store: Record<string, MvpRecord[]>) {
  localStorage.setItem('futbolines_mvp_records', JSON.stringify(store));
}

export function getPlayerMvpRecords(userId: string): MvpRecord[] {
  return getMvpRecordsStore()[userId] || [];
}

export function saveMvpRecord(userId: string, record: MvpRecord) {
  const store = getMvpRecordsStore();
  if (!store[userId]) store[userId] = [];
  if (!store[userId].some(r => r.tournamentId === record.tournamentId)) {
    store[userId].push(record);
    saveMvpRecordsStore(store);
  }
}

function getAchievementsStore(): Record<string, PlayerAchievement[]> {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAchievementsStore(store: Record<string, PlayerAchievement[]>) {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(store));
}

function getPlayerAchievements(userId: string): PlayerAchievement[] {
  const store = getAchievementsStore();
  const raw = Array.isArray(store[userId]) ? store[userId] : [];
  const seen = new Set<AchievementId>();
  return raw.filter((item): item is PlayerAchievement => {
    if (!item || typeof item !== 'object') return false;
    if (!item.achievementId || seen.has(item.achievementId)) return false;
    seen.add(item.achievementId);
    return true;
  });
}

function savePlayerAchievement(userId: string, achievementId: AchievementId) {
  const store = getAchievementsStore();
  if (!store[userId]) store[userId] = [];
  if (store[userId].some(a => a.achievementId === achievementId)) return;
  store[userId].push({ achievementId, unlockedAt: new Date().toISOString() });
  saveAchievementsStore(store);
}

export function checkAndGrantAchievement(userId: string, achievementId: AchievementId) {
  savePlayerAchievement(userId, achievementId);
}

export function calculateTournamentAvgElo(tournamentId: string): { avgElo: number; count: number } {
  const pairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId);
  const elos: number[] = [];
  pairs.forEach(p => { elos.push(p.goalkeeper.elo, p.forward.elo); });
  const avg = elos.length > 0 ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 1500;
  return { avgElo: avg, count: elos.length };
}

export function setTournamentMvp(tournamentId: string, mvpUserId: string, mvpName: string) {
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
  if (!tournament) return;
  tournament.mvpPlayerId = mvpUserId;
  tournament.mvpPlayerName = mvpName;
  
  const { avgElo } = calculateTournamentAvgElo(tournamentId);
  const venue = MOCK_VENUES.find(v => v.id === tournament.venueId);
  
  const mvpPairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId);
  const hasGuestsInTournament = mvpPairs.some(p =>
    isGuestPlayer(p.goalkeeper.userId) || isGuestPlayer(p.forward.userId)
  );

  if (!isGuestPlayer(mvpUserId)) {
    const ranking = MOCK_RANKINGS.find(r => r.userId === mvpUserId);
    if (ranking) {
      ranking.mvpCount = (ranking.mvpCount || 0) + 1;

      if (!hasGuestsInTournament) {
        const mvpBonus = getTournamentMVPBonus(tournamentId);
        const mvpPair = mvpPairs.find(p => p.goalkeeper.userId === mvpUserId || p.forward.userId === mvpUserId);
        const mvpPosition: 'portero' | 'delantero' = mvpPair?.goalkeeper.userId === mvpUserId ? 'portero' : 'delantero';
        const mvpMode = tournament.playStyle as 'parado' | 'movimiento';
        const eloKey = getEloKey(mvpPosition, mvpMode);

        ranking[eloKey] += mvpBonus;
        recalcGeneralElo(ranking);

        recordEloHistory(mvpUserId, ranking[eloKey], 'MVP: ' + tournament.name, `${mvpPosition}_${mvpMode}` as any);
        recordEloHistory(mvpUserId, ranking.general, 'MVP: ' + tournament.name, 'general');
        addActivityEntry({ userId: mvpUserId, type: 'mvp', description: 'MVP en ' + tournament.name, eloChange: mvpBonus, date: new Date().toISOString() });
      }
      
      updatePlayerAchievementProgress(mvpUserId, 'mvp_count', ranking.mvpCount);
      if (avgElo >= 1600) {
        const currentHighLevelMvps = getPlayerMvpRecords(mvpUserId).filter(r => r.avgElo >= 1600).length + 1;
        updatePlayerAchievementProgress(mvpUserId, 'mvp_high_level', currentHighLevelMvps);
      }
    }
    
    saveMvpRecord(mvpUserId, {
      tournamentId,
      tournamentName: tournament.name,
      date: tournament.date,
      venueName: venue?.name,
      format: tournament.format,
      avgElo,
    });
    
    checkAndGrantAchievement(mvpUserId, 'mvp_tournament');
  }
  persistRankings();
  persistTournaments();
}

export function finalizeTournament(tournamentId: string, winnerPairId?: string) {
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
  if (!tournament) return;
  tournament.status = 'finalizado';
  if (winnerPairId) {
    recordTournamentWin(tournamentId, winnerPairId);
  }
  const tPairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId);
  tPairs.forEach(p => {
    [p.goalkeeper.userId, p.forward.userId].forEach(uid => {
      if (!isGuestPlayer(uid)) {
        checkStreakAchievement(uid);
        checkVenueTableAchievements(uid);
      }
    });
  });
  persistRankings();
  persistTournaments();
}

export function getUserAchievements(userId: string): (Achievement & { unlockedAt: string })[] {
  const playerAch = getPlayerAchievements(userId);
  return playerAch
    .map(pa => {
      const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === pa.achievementId);
      return def ? { ...def, unlockedAt: pa.unlockedAt } : null;
    })
    .filter((item): item is Achievement & { unlockedAt: string } => Boolean(item));
}

export function checkStreakAchievement(userId: string) {
  const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
  if (ranking && ranking.currentStreak >= 10) {
    checkAndGrantAchievement(userId, 'ten_win_streak');
  }
}

export function checkVenueTableAchievements(userId: string) {
  const venueIds = new Set<string>();
  const tableBrands = new Set<string>();
  MOCK_TOURNAMENTS.forEach(t => {
    const userInTournament = MOCK_PAIRS.some(p =>
      p.tournamentId === t.id && (p.goalkeeper.userId === userId || p.forward.userId === userId)
    );
    if (userInTournament) {
      venueIds.add(t.venueId);
      tableBrands.add(t.tableBrand);
    }
  });
  if (venueIds.size >= 3) checkAndGrantAchievement(userId, 'play_3_venues');
  if (tableBrands.size >= 5) checkAndGrantAchievement(userId, 'play_5_tables');
}

// ===== VENUE LEAGUES =====

export function getVenueLeagues(venueId: string): VenueLeague[] {
  try {
    const all: VenueLeague[] = JSON.parse(localStorage.getItem(VENUE_LEAGUES_KEY) || '[]');
    return all.filter(l => l.venueId === venueId);
  } catch { return []; }
}

export function createVenueLeague(venueId: string, name: string): VenueLeague {
  const all: VenueLeague[] = JSON.parse(localStorage.getItem(VENUE_LEAGUES_KEY) || '[]');
  const league: VenueLeague = { id: `league_${Date.now()}`, venueId, name, tournamentIds: [], createdAt: new Date().toISOString() };
  all.push(league);
  localStorage.setItem(VENUE_LEAGUES_KEY, JSON.stringify(all));
  return league;
}

export function addTournamentToLeague(leagueId: string, tournamentId: string) {
  const all: VenueLeague[] = JSON.parse(localStorage.getItem(VENUE_LEAGUES_KEY) || '[]');
  const league = all.find(l => l.id === leagueId);
  if (league && !league.tournamentIds.includes(tournamentId)) {
    league.tournamentIds.push(tournamentId);
    localStorage.setItem(VENUE_LEAGUES_KEY, JSON.stringify(all));
  }
}

export function getLeagueStandings(leagueId: string): { userId: string; displayName: string; points: number; wins: number; losses: number }[] {
  const all: VenueLeague[] = JSON.parse(localStorage.getItem(VENUE_LEAGUES_KEY) || '[]');
  const league = all.find(l => l.id === leagueId);
  if (!league) return [];

  const playerStats: Record<string, { displayName: string; points: number; wins: number; losses: number }> = {};
  league.tournamentIds.forEach(tId => {
    const winnerPairs = MOCK_PAIRS.filter(p => p.tournamentId === tId && p.status === 'ganadora');
    winnerPairs.forEach(p => {
      [p.goalkeeper, p.forward].forEach(m => {
        if (!playerStats[m.userId]) playerStats[m.userId] = { displayName: m.displayName, points: 0, wins: 0, losses: 0 };
        playerStats[m.userId].points += 3;
        playerStats[m.userId].wins++;
      });
    });
    const loserPairs = MOCK_PAIRS.filter(p => p.tournamentId === tId && p.status !== 'ganadora');
    loserPairs.forEach(p => {
      [p.goalkeeper, p.forward].forEach(m => {
        if (!playerStats[m.userId]) playerStats[m.userId] = { displayName: m.displayName, points: 0, wins: 0, losses: 0 };
        playerStats[m.userId].points += 1;
        playerStats[m.userId].losses++;
      });
    });
  });
  return Object.entries(playerStats)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.points - a.points);
}

// ===== TEAM RANKING =====

export function getTeamRanking(): (Team & { stats: TeamStats; winrate: number })[] {
  return MOCK_TEAMS.map(team => {
    const stats = getTeamStats(team.id);
    const total = stats.wins + stats.losses;
    return { ...team, stats, winrate: total > 0 ? Math.round((stats.wins / total) * 100) : 0 };
  }).sort((a, b) => b.elo - a.elo);
}

// ===== TIERED ACHIEVEMENTS (PROGRESS-BASED) =====

const TIERED_PROGRESS_KEY = 'futbolines_tiered_achievements';

function getTieredProgressStore(): Record<string, Record<string, number>> {
  try {
    return JSON.parse(localStorage.getItem(TIERED_PROGRESS_KEY) || '{}');
  } catch { return {}; }
}

function saveTieredProgressStore(store: Record<string, Record<string, number>>) {
  localStorage.setItem(TIERED_PROGRESS_KEY, JSON.stringify(store));
}

export function updatePlayerAchievementProgress(userId: string, achievementId: string, progress: number) {
  const store = getTieredProgressStore();
  if (!store[userId]) store[userId] = {};
  store[userId][achievementId] = Math.max(store[userId][achievementId] || 0, progress);
  saveTieredProgressStore(store);
}

export function getPlayerTieredAchievements(userId: string): PlayerTieredAchievement[] {
  const store = getTieredProgressStore();
  const playerProgress = store[userId] || {};
  return TIERED_ACHIEVEMENTS.map(achievement => {
    const progress = playerProgress[achievement.id] || 0;
    const level = calculateLevel(progress, achievement.tiers);
    const unlockedTiers: { level: number; unlockedAt: string }[] = [];
    for (let i = 0; i < level; i++) {
      unlockedTiers.push({ level: i + 1, unlockedAt: new Date().toISOString() });
    }
    return { achievementId: achievement.id, currentValue: progress, unlockedTiers };
  });
}

// ===== RESULT CORRECTIONS =====

export function getCorrections(tournamentId: string): ResultCorrection[] {
  try {
    const all: ResultCorrection[] = JSON.parse(localStorage.getItem(CORRECTIONS_KEY) || '[]');
    return all.filter(c => c.tournamentId === tournamentId);
  } catch { return []; }
}

export function saveCorrection(correction: ResultCorrection) {
  try {
    const all: ResultCorrection[] = JSON.parse(localStorage.getItem(CORRECTIONS_KEY) || '[]');
    all.push(correction);
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(all));
  } catch {}
}

// ===== MOCK USER =====

export const MOCK_USER: User = {
  id: 'u1', email: 'carlos@futbol.es', nickname: 'carlitos', displayName: 'Carlos García',
  city: 'Madrid', postalCode: '28001', avatarUrl: undefined, preferredPosition: 'portero',
  preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado', createdAt: '2024-01-15',
};

// ===== VENUES =====

export const MOCK_VENUES: Venue[] = [
  { id: 'v1', name: 'Bar El Rincón', address: 'C/ Gran Vía 42', city: 'Madrid', photos: ['/placeholder.svg'], description: 'Bar clásico con futbolín de competición.', observations: 'Abierto solo fines de semana.', status: 'activo', verificationLevel: 'verificado', lastVerified: '2026-01-15', confidenceScore: 92, verificationCount: 5, createdBy: 'u1', createdAt: '2024-01-01' },
  { id: 'v2', name: 'Café Sport', address: 'Av. Diagonal 305', city: 'Barcelona', photos: ['/placeholder.svg'], description: 'Cafetería deportiva con ambiente competitivo.', status: 'activo', verificationLevel: 'verificado', lastVerified: '2026-02-01', confidenceScore: 88, verificationCount: 4, createdBy: 'u2', createdAt: '2024-02-15' },
  { id: 'v3', name: 'La Bolera Social', address: 'Alameda Mazarredo 8', city: 'Bilbao', photos: ['/placeholder.svg'], description: 'Local con zona de juegos y futbolín profesional.', status: 'activo', verificationLevel: 'no_verificado', confidenceScore: 65, verificationCount: 1, createdBy: 'u3', createdAt: '2024-03-10' },
  { id: 'v4', name: 'Pub Game Over', address: 'C/ Sierpes 20', city: 'Sevilla', photos: ['/placeholder.svg'], description: 'Pub temático gamer con varios futbolines.', status: 'activo', verificationLevel: 'verificado', lastVerified: '2026-01-20', confidenceScore: 85, verificationCount: 3, createdBy: 'u4', createdAt: '2024-04-01' },
  { id: 'v5', name: 'Bar Universitario', address: 'C/ Doctor Moliner 50', city: 'Valencia', photos: ['/placeholder.svg'], status: 'activo', verificationLevel: 'no_verificado', confidenceScore: 55, verificationCount: 0, createdBy: 'u5', createdAt: '2024-05-01' },
  { id: 'v6', name: 'Recreativos Luna', address: 'C/ Luna 12', city: 'Madrid', photos: ['/placeholder.svg'], description: 'Sala de recreativos con futbolín clásico.', status: 'activo', verificationLevel: 'no_verificado', confidenceScore: 60, verificationCount: 1, createdBy: 'u6', createdAt: '2024-06-01' },
];

export const MOCK_TABLES: VenueTable[] = [
  { id: 't1', venueId: 'v1', brand: 'Presas', quantity: 2, condition: 'buen_estado', photos: ['/placeholder.svg'] },
  { id: 't2', venueId: 'v2', brand: 'Tsunami', quantity: 1, condition: 'perfecta', photos: ['/placeholder.svg'] },
  { id: 't3', venueId: 'v3', brand: 'Presas', quantity: 1, condition: 'estado_normal', photos: ['/placeholder.svg'] },
  { id: 't4', venueId: 'v4', brand: 'Val', quantity: 2, condition: 'buen_estado', photos: ['/placeholder.svg'] },
  { id: 't5', venueId: 'v5', brand: 'Garlando', quantity: 1, condition: 'estado_normal', photos: ['/placeholder.svg'] },
  { id: 't6', venueId: 'v6', brand: 'Presas', quantity: 1, condition: 'deteriorada', photos: ['/placeholder.svg'] },
];

// ===== TEAMS =====

export const MOCK_TEAMS: Team[] = [
  { id: 'team1', name: 'Madrid Fury', logoUrl: undefined, city: 'Madrid', postalCode: '28001', captainId: 'u1', elo: 1800, createdAt: '2024-06-01' },
  { id: 'team2', name: 'Barcelona FC Futbolín', logoUrl: undefined, city: 'Barcelona', postalCode: '08001', captainId: 'u2', elo: 1750, createdAt: '2024-07-15' },
  { id: 'team3', name: 'Athletic Bilbaíno', logoUrl: undefined, city: 'Bilbao', postalCode: '48001', captainId: 'u3', elo: 1700, createdAt: '2024-08-20' },
];

// ===== TOURNAMENTS =====

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'to1', name: 'Torneo de Primavera Madrid', description: 'Gran torneo de primavera en Madrid.',
    date: '2026-04-15', time: '18:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 16,
    entryFee: 10, prizes: '1º: 200€, 2º: 100€', organizerId: 'u1', organizerName: 'Carlos García',
    requiresApproval: false, status: 'abierto', hasCategories: false, categories: [], createdAt: '2026-03-01',
  },
  {
    id: 'to2', name: 'Liga Barcelona Verano', description: 'Liga de verano barcelonesa.',
    date: '2026-06-01', time: '17:00', venueId: 'v2', venueName: 'Café Sport',
    city: 'Barcelona', tableBrand: 'Tsunami', playStyle: 'movimiento',
    format: 'round_robin', pairingMode: 'inscripcion', maxPairs: 8,
    organizerId: 'u2', organizerName: 'Laura Martínez',
    requiresApproval: true, status: 'abierto', hasCategories: false, categories: [], createdAt: '2026-04-01',
  },
  {
    id: 'to3', name: 'Campeonato Bilbao', description: 'El campeonato de Bilbao.',
    date: '2026-05-20', time: '16:00', venueId: 'v3', venueName: 'La Bolera Social',
    city: 'Bilbao', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_doble', pairingMode: 'equilibradas', maxPairs: 12,
    entryFee: 5, organizerId: 'u3', organizerName: 'Mikel Etxebarria',
    requiresApproval: false, status: 'abierto', hasCategories: false, categories: [], createdAt: '2026-04-15',
  },
  {
    id: 'to4', name: 'Rey de la Pista Sevilla', description: 'Formato rey de la pista.',
    date: '2026-07-10', time: '19:00', venueId: 'v4', venueName: 'Pub Game Over',
    city: 'Sevilla', tableBrand: 'Val', playStyle: 'movimiento',
    format: 'rey_mesa', pairingMode: 'inscripcion', maxPairs: 16, kingLaps: 3,
    organizerId: 'u4', organizerName: 'Ana López',
    requiresApproval: false, status: 'abierto', hasCategories: false, categories: [], createdAt: '2026-05-01',
  },
  {
    id: 'to5', name: 'Torneo Grupos Madrid', description: 'Fase de grupos + eliminatoria.',
    date: '2026-08-01', time: '11:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'grupos_cuadro', pairingMode: 'inscripcion', maxPairs: 16,
    groupSize: 3, qualifyPerGroup: 2,
    organizerId: 'u1', organizerName: 'Carlos García',
    requiresApproval: false, status: 'abierto', hasCategories: false, categories: [], createdAt: '2026-06-01',
  },
  // Historical tournaments
  {
    id: 'to_h1', name: 'Campeonato Madrid Otoño', description: 'Primer campeonato de la temporada.',
    date: '2025-09-15', time: '18:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 16,
    entryFee: 10, organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-08-15',
    mvpPlayerId: 'u1', mvpPlayerName: 'Carlos García',
  },
  {
    id: 'to_h2', name: 'Copa Barcelona Septiembre', description: 'Torneo clásico de septiembre.',
    date: '2025-09-28', time: '17:00', venueId: 'v2', venueName: 'Café Sport',
    city: 'Barcelona', tableBrand: 'Tsunami', playStyle: 'movimiento',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 12,
    entryFee: 8, organizerId: 'u2', organizerName: 'Laura Martínez', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-08-20',
    mvpPlayerId: 'u2', mvpPlayerName: 'Laura Martínez',
  },
  {
    id: 'to_h3', name: 'Liga Bilbao Otoño', description: 'Liga de otoño en Bilbao.',
    date: '2025-10-05', time: '16:00', venueId: 'v3', venueName: 'La Bolera Social',
    city: 'Bilbao', tableBrand: 'Presas', playStyle: 'parado',
    format: 'round_robin', pairingMode: 'inscripcion', maxPairs: 8,
    organizerId: 'u3', organizerName: 'Mikel Etxebarria', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-09-01',
    mvpPlayerId: 'u3', mvpPlayerName: 'Mikel Etxebarria',
  },
  {
    id: 'to_h4', name: 'Copa Sevilla Halloween', description: 'Torneo especial de Halloween.',
    date: '2025-10-31', time: '20:00', venueId: 'v4', venueName: 'Pub Game Over',
    city: 'Sevilla', tableBrand: 'Val', playStyle: 'movimiento',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 16,
    entryFee: 12, organizerId: 'u4', organizerName: 'Ana López', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-09-28',
    mvpPlayerId: 'u4', mvpPlayerName: 'Ana López',
  },
  {
    id: 'to_h5', name: 'Torneo Valencia Noviembre', description: 'Competición mensual.',
    date: '2025-11-10', time: '17:00', venueId: 'v5', venueName: 'Bar Universitario',
    city: 'Valencia', tableBrand: 'Garlando', playStyle: 'parado',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 12,
    organizerId: 'u5', organizerName: 'Pedro Sánchez', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-10-15',
    mvpPlayerId: 'u5', mvpPlayerName: 'Pedro Sánchez',
  },
  {
    id: 'to_h6', name: 'Copa Madrid Diciembre', description: 'Último torneo del año.',
    date: '2025-12-14', time: '18:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 16,
    entryFee: 15, organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-11-20',
    mvpPlayerId: 'u1', mvpPlayerName: 'Carlos García',
  },
  {
    id: 'to_h7', name: 'Liga Barcelona Invierno', description: 'Liga invernal.',
    date: '2025-12-20', time: '17:00', venueId: 'v2', venueName: 'Café Sport',
    city: 'Barcelona', tableBrand: 'Tsunami', playStyle: 'movimiento',
    format: 'round_robin', pairingMode: 'inscripcion', maxPairs: 8,
    organizerId: 'u2', organizerName: 'Laura Martínez', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-11-25',
    mvpPlayerId: 'u2', mvpPlayerName: 'Laura Martínez',
  },
  {
    id: 'to_h8', name: 'Torneo Rey Bilbao', description: 'Rey de la pista en Bilbao.',
    date: '2026-01-05', time: '16:00', venueId: 'v3', venueName: 'La Bolera Social',
    city: 'Bilbao', tableBrand: 'Presas', playStyle: 'parado',
    format: 'rey_mesa', pairingMode: 'inscripcion', maxPairs: 16, kingLaps: 2,
    organizerId: 'u3', organizerName: 'Mikel Etxebarria', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-12-15',
    mvpPlayerId: 'u3', mvpPlayerName: 'Mikel Etxebarria',
  },
  {
    id: 'to_h9', name: 'Copa Sevilla Enero', description: 'Torneo mensual.',
    date: '2026-01-18', time: '19:00', venueId: 'v4', venueName: 'Pub Game Over',
    city: 'Sevilla', tableBrand: 'Val', playStyle: 'movimiento',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 12,
    entryFee: 10, organizerId: 'u4', organizerName: 'Ana López', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-12-28',
    mvpPlayerId: 'u4', mvpPlayerName: 'Ana López',
  },
  {
    id: 'to_h10', name: 'Liga Madrid Febrero', description: 'Liga mensual de Madrid.',
    date: '2026-02-15', time: '18:00', venueId: 'v6', venueName: 'Recreativos Luna',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'round_robin', pairingMode: 'inscripcion', maxPairs: 8,
    organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2026-01-20',
    mvpPlayerId: 'u6', mvpPlayerName: 'María Fernández',
  },
  {
    id: 'to_h11', name: 'Torneo Año Nuevo Madrid', description: 'Primer torneo del año.',
    date: '2026-01-10', time: '18:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 16,
    entryFee: 10, organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-12-28',
    mvpPlayerId: 'u1', mvpPlayerName: 'Carlos García',
  },
  {
    id: 'to_h12', name: 'Open Otoño Barcelona', description: 'Torneo de otoño.',
    date: '2025-11-15', time: '17:00', venueId: 'v2', venueName: 'Café Sport',
    city: 'Barcelona', tableBrand: 'Tsunami', playStyle: 'movimiento',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 12,
    entryFee: 8, organizerId: 'u2', organizerName: 'Laura Martínez', requiresApproval: false,
    status: 'finalizado', hasCategories: false, categories: [], createdAt: '2025-10-25',
    mvpPlayerId: 'u1', mvpPlayerName: 'Carlos García',
  },
];

export const MOCK_PAIRS: TournamentPair[] = [
  { id: 'p1', tournamentId: 'to1', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 }, seed: 1, status: 'confirmada' },
  { id: 'p2', tournamentId: 'to1', goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 }, forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 }, seed: 2, status: 'confirmada' },
  { id: 'p3', tournamentId: 'to1', goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 3, status: 'inscrita' },
  { id: 'p4', tournamentId: 'to1', goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 }, forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 }, seed: 4, status: 'inscrita' },
  { id: 'p5', tournamentId: 'to1', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 5, status: 'inscrita' },
  { id: 'p6', tournamentId: 'to1', goalkeeper: { userId: 'u2', displayName: 'Laura Martínez', elo: 1780 }, forward: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1680 }, seed: 6, status: 'inscrita' },
  { id: 'pk1', tournamentId: 'to4', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 }, seed: 1, status: 'confirmada' },
  { id: 'pk2', tournamentId: 'to4', goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 }, forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 }, seed: 2, status: 'confirmada' },
  { id: 'pk3', tournamentId: 'to4', goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 3, status: 'inscrita' },
  { id: 'pk4', tournamentId: 'to4', goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 }, forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 }, seed: 4, status: 'inscrita' },
  { id: 'pg1', tournamentId: 'to5', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 }, seed: 1, status: 'confirmada' },
  { id: 'pg2', tournamentId: 'to5', goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 }, forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 }, seed: 2, status: 'confirmada' },
  { id: 'pg3', tournamentId: 'to5', goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 3, status: 'confirmada' },
  { id: 'pg4', tournamentId: 'to5', goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 }, forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 }, seed: 4, status: 'confirmada' },
  { id: 'pg5', tournamentId: 'to5', goalkeeper: { userId: 'u2', displayName: 'Laura Martínez', elo: 1780 }, forward: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1680 }, seed: 5, status: 'confirmada' },
  { id: 'pg6', tournamentId: 'to5', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 6, status: 'confirmada' },
];

export const MOCK_RANKINGS: (PlayerRating & { displayName: string; city: string; postalCode?: string; avatarUrl?: string; preferredPosition?: Position; preferredStyle?: 'parado' | 'movimiento'; preferredTable?: TableBrand; playerType?: PlayerType })[] = [
  { userId: 'u1', displayName: 'Carlos García', city: 'Madrid', postalCode: '28001', general: 1825, asGoalkeeper: 1900, asForward: 1750, goalkeeperStill: 1920, goalkeeperMoving: 1880, forwardStill: 1730, forwardMoving: 1770, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 142, losses: 58, tournamentsPlayed: 34, tournamentsWon: 8, mvpCount: 5, currentStreak: 3, bestStreak: 8, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u2', displayName: 'Laura Martínez', city: 'Barcelona', postalCode: '08001', general: 1820, asGoalkeeper: 1780, asForward: 1860, goalkeeperStill: 1760, goalkeeperMoving: 1800, forwardStill: 1840, forwardMoving: 1880, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 128, losses: 52, tournamentsPlayed: 30, tournamentsWon: 7, mvpCount: 3, currentStreak: 1, bestStreak: 6, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Tsunami', playerType: 'registrado' },
  { userId: 'u3', displayName: 'Mikel Etxebarria', city: 'Bilbao', postalCode: '48001', general: 1775, asGoalkeeper: 1830, asForward: 1720, goalkeeperStill: 1850, goalkeeperMoving: 1810, forwardStill: 1740, forwardMoving: 1700, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 115, losses: 65, tournamentsPlayed: 28, tournamentsWon: 5, mvpCount: 2, currentStreak: 0, bestStreak: 5, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u4', displayName: 'Ana López', city: 'Sevilla', postalCode: '41001', general: 1750, asGoalkeeper: 1700, asForward: 1800, goalkeeperStill: 1680, goalkeeperMoving: 1720, forwardStill: 1780, forwardMoving: 1820, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 98, losses: 62, tournamentsPlayed: 25, tournamentsWon: 4, mvpCount: 1, currentStreak: 2, bestStreak: 4, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Val', playerType: 'registrado' },
  { userId: 'u5', displayName: 'Pedro Sánchez', city: 'Valencia', postalCode: '46001', general: 1710, asGoalkeeper: 1740, asForward: 1680, goalkeeperStill: 1760, goalkeeperMoving: 1720, forwardStill: 1700, forwardMoving: 1660, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 89, losses: 71, tournamentsPlayed: 22, tournamentsWon: 3, mvpCount: 0, currentStreak: 0, bestStreak: 3, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Garlando', playerType: 'registrado' },
  { userId: 'u6', displayName: 'María Fernández', city: 'Madrid', postalCode: '28002', general: 1700, asGoalkeeper: 1650, asForward: 1750, goalkeeperStill: 1630, goalkeeperMoving: 1670, forwardStill: 1730, forwardMoving: 1770, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 82, losses: 68, tournamentsPlayed: 20, tournamentsWon: 2, mvpCount: 1, currentStreak: 1, bestStreak: 4, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u7', displayName: 'Javi Ruiz', city: 'Bilbao', postalCode: '48002', general: 1670, asGoalkeeper: 1720, asForward: 1620, goalkeeperStill: 1740, goalkeeperMoving: 1700, forwardStill: 1640, forwardMoving: 1600, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 76, losses: 74, tournamentsPlayed: 18, tournamentsWon: 2, mvpCount: 0, currentStreak: 0, bestStreak: 3, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u8', displayName: 'Elena Torres', city: 'Barcelona', postalCode: '08002', general: 1650, asGoalkeeper: 1600, asForward: 1700, goalkeeperStill: 1580, goalkeeperMoving: 1620, forwardStill: 1680, forwardMoving: 1720, byTable: {}, byStyle: { parado: 0, movimiento: 0 }, wins: 70, losses: 60, tournamentsPlayed: 16, tournamentsWon: 1, mvpCount: 0, currentStreak: 2, bestStreak: 3, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Tsunami', playerType: 'registrado' },
];

// ===== PERSISTENCE LAYER =====

export function persistRankings() {
  localStorage.setItem(RANKINGS_OVERRIDES_KEY, JSON.stringify(MOCK_RANKINGS));
}

export function persistTournaments() {
  localStorage.setItem(TOURNAMENTS_OVERRIDES_KEY, JSON.stringify(MOCK_TOURNAMENTS));
}

export function persistPairs() {
  localStorage.setItem(PAIRS_OVERRIDES_KEY, JSON.stringify(MOCK_PAIRS));
}

// ===== 5-ELO HELPERS =====

export type EloKey = 'goalkeeperStill' | 'goalkeeperMoving' | 'forwardStill' | 'forwardMoving';

export function getEloKey(position: 'portero' | 'delantero', mode: 'parado' | 'movimiento'): EloKey {
  if (position === 'portero') return mode === 'parado' ? 'goalkeeperStill' : 'goalkeeperMoving';
  return mode === 'parado' ? 'forwardStill' : 'forwardMoving';
}

export function recalcGeneralElo(ranking: typeof MOCK_RANKINGS[0]) {
  if (ranking.goalkeeperStill == null) ranking.goalkeeperStill = ranking.asGoalkeeper || 1500;
  if (ranking.goalkeeperMoving == null) ranking.goalkeeperMoving = ranking.asGoalkeeper || 1500;
  if (ranking.forwardStill == null) ranking.forwardStill = ranking.asForward || 1500;
  if (ranking.forwardMoving == null) ranking.forwardMoving = ranking.asForward || 1500;
  
  ranking.asGoalkeeper = Math.round((ranking.goalkeeperStill + ranking.goalkeeperMoving) / 2);
  ranking.asForward = Math.round((ranking.forwardStill + ranking.forwardMoving) / 2);
  ranking.general = Math.round((ranking.goalkeeperStill + ranking.goalkeeperMoving + ranking.forwardStill + ranking.forwardMoving) / 4);
}

// ===== CONTEXT STATS (mode & table performance tracking — stats only, no ELO effect) =====

export interface ContextStats {
  byMode: Record<string, { matches: number; wins: number; losses: number }>;
  byTable: Record<string, { matches: number; wins: number; losses: number }>;
}

function getContextStatsStore(): Record<string, ContextStats> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTEXT_STATS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function saveContextStatsStore(store: Record<string, ContextStats>) {
  localStorage.setItem(CONTEXT_STATS_KEY, JSON.stringify(store));
}

export function getContextStats(userId: string): ContextStats {
  const store = getContextStatsStore();
  return store[userId] || { byMode: {}, byTable: {} };
}

export function recordContextStats(userId: string, mode: string, table: string, won: boolean, options?: { revert?: boolean }) {
  if (isGuestPlayer(userId)) return;
  const store = getContextStatsStore();
  if (!store[userId]) store[userId] = { byMode: {}, byTable: {} };
  const stats = store[userId];

  if (!stats.byMode[mode]) stats.byMode[mode] = { matches: 0, wins: 0, losses: 0 };
  if (options?.revert) {
    stats.byMode[mode].matches = Math.max(0, stats.byMode[mode].matches - 1);
    if (won) stats.byMode[mode].wins = Math.max(0, stats.byMode[mode].wins - 1);
    else stats.byMode[mode].losses = Math.max(0, stats.byMode[mode].losses - 1);
  } else {
    stats.byMode[mode].matches++;
    if (won) stats.byMode[mode].wins++;
    else stats.byMode[mode].losses++;
  }

  if (!stats.byTable[table]) stats.byTable[table] = { matches: 0, wins: 0, losses: 0 };
  if (options?.revert) {
    stats.byTable[table].matches = Math.max(0, stats.byTable[table].matches - 1);
    if (won) stats.byTable[table].wins = Math.max(0, stats.byTable[table].wins - 1);
    else stats.byTable[table].losses = Math.max(0, stats.byTable[table].losses - 1);
  } else {
    stats.byTable[table].matches++;
    if (won) stats.byTable[table].wins++;
    else stats.byTable[table].losses++;
  }

  saveContextStatsStore(store);
}

// Contextual coefficient — DEPRECATED, always returns 1.0 (no contextual ELO adjustments)
export function getContextualCoefficient(_userId: string, _mode: string, _table: string, _isWin: boolean): number {
  return 1.0;
}

function sanitizeAdjustments(ranking: typeof MOCK_RANKINGS[0]) {
  if (ranking.goalkeeperStill == null) ranking.goalkeeperStill = ranking.asGoalkeeper || 1500;
  if (ranking.goalkeeperMoving == null) ranking.goalkeeperMoving = ranking.asGoalkeeper || 1500;
  if (ranking.forwardStill == null) ranking.forwardStill = ranking.asForward || 1500;
  if (ranking.forwardMoving == null) ranking.forwardMoving = ranking.asForward || 1500;
  recalcGeneralElo(ranking);
}

// Restore rankings overrides
try {
  const savedRankings = localStorage.getItem(RANKINGS_OVERRIDES_KEY);
  if (savedRankings) {
    const parsed = JSON.parse(savedRankings);
    if (Array.isArray(parsed)) {
      parsed.forEach((saved: typeof MOCK_RANKINGS[0]) => {
        sanitizeAdjustments(saved);
        const idx = MOCK_RANKINGS.findIndex(r => r.userId === saved.userId);
        if (idx >= 0) {
          Object.assign(MOCK_RANKINGS[idx], saved);
        } else {
          MOCK_RANKINGS.push(saved);
        }
      });
    }
  }
} catch {}

MOCK_RANKINGS.forEach(sanitizeAdjustments);

// Restore tournament overrides
try {
  const savedTournaments = localStorage.getItem(TOURNAMENTS_OVERRIDES_KEY);
  if (savedTournaments) {
    const parsed = JSON.parse(savedTournaments);
    if (Array.isArray(parsed)) {
      parsed.forEach((saved: Tournament) => {
        const idx = MOCK_TOURNAMENTS.findIndex(t => t.id === saved.id);
        if (idx >= 0) {
          Object.assign(MOCK_TOURNAMENTS[idx], saved);
        } else {
          MOCK_TOURNAMENTS.push(saved);
        }
      });
    }
  }
} catch {}

// Restore pairs overrides
try {
  const savedPairs = localStorage.getItem(PAIRS_OVERRIDES_KEY);
  if (savedPairs) {
    const parsed = JSON.parse(savedPairs);
    if (Array.isArray(parsed)) {
      parsed.forEach((saved: TournamentPair) => {
        const idx = MOCK_PAIRS.findIndex(p => p.id === saved.id);
        if (idx >= 0) {
          Object.assign(MOCK_PAIRS[idx], saved);
        } else {
          MOCK_PAIRS.push(saved);
        }
      });
    }
  }
} catch {}

// ===== TABLE PERFORMANCE =====

export interface TablePerformance {
  userId: string;
  tableBrand: TableBrand;
  matches: number;
  wins: number;
  losses: number;
}

export function getTablePerformance(userId: string): TablePerformance[] {
  try {
    const all: TablePerformance[] = JSON.parse(localStorage.getItem(TABLE_PERFORMANCE_KEY) || '[]');
    return all.filter(tp => tp.userId === userId);
  } catch { return []; }
}

export function updateTablePerformance(userId: string, tableBrand: TableBrand, won: boolean) {
  if (isGuestPlayer(userId)) return;
  try {
    const all: TablePerformance[] = JSON.parse(localStorage.getItem(TABLE_PERFORMANCE_KEY) || '[]');
    let existing = all.find(tp => tp.userId === userId && tp.tableBrand === tableBrand);
    if (!existing) {
      existing = { userId, tableBrand, matches: 0, wins: 0, losses: 0 };
      all.push(existing);
    }
    existing.matches++;
    if (won) existing.wins++;
    else existing.losses++;
    localStorage.setItem(TABLE_PERFORMANCE_KEY, JSON.stringify(all));
  } catch {}
}

// ===== ELO HISTORY =====

export interface EloHistoryEntry {
  userId: string;
  elo: number;
  date: string;
  event?: string;
  position?: string;
}

export function getEloHistory(userId: string): EloHistoryEntry[] {
  try {
    const all: EloHistoryEntry[] = JSON.parse(localStorage.getItem('futbolines_elo_history') || '[]');
    return all.filter(e => e.userId === userId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch { return []; }
}

export function recordEloHistory(userId: string, elo: number, event?: string, position?: string) {
  if (isGuestPlayer(userId)) return;
  try {
    const all: EloHistoryEntry[] = JSON.parse(localStorage.getItem('futbolines_elo_history') || '[]');
    all.push({ userId, elo, date: new Date().toISOString(), event, position: position || 'general' });
    localStorage.setItem('futbolines_elo_history', JSON.stringify(all));
  } catch {}
}

// ensureEloHistory: only creates a single registration point at the user's actual creation date
// Does NOT fabricate historical data
export function ensureEloHistory(userId: string) {
  try {
    const all: EloHistoryEntry[] = JSON.parse(localStorage.getItem('futbolines_elo_history') || '[]');
    const userEntries = all.filter(e => e.userId === userId);
    if (userEntries.length > 0) return;

    const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
    if (!ranking) return;
    
    const regUsers = getRegisteredUsers();
    const regUser = regUsers.find(u => u.id === userId);
    const registrationDate = regUser?.createdAt ? new Date(regUser.createdAt).toISOString() : new Date().toISOString();
    
    // Only add a single registration point per ELO type — no fake history
    const currentGeneral = ranking.general;
    const currentGkStill = ranking.goalkeeperStill ?? 1500;
    const currentGkMoving = ranking.goalkeeperMoving ?? 1500;
    const currentFwStill = ranking.forwardStill ?? 1500;
    const currentFwMoving = ranking.forwardMoving ?? 1500;

    all.push({ userId, elo: currentGeneral, date: registrationDate, position: 'general', event: 'Registro' });
    all.push({ userId, elo: currentGkStill, date: registrationDate, position: 'portero_parado', event: 'Registro' });
    all.push({ userId, elo: currentGkMoving, date: registrationDate, position: 'portero_movimiento', event: 'Registro' });
    all.push({ userId, elo: currentFwStill, date: registrationDate, position: 'delantero_parado', event: 'Registro' });
    all.push({ userId, elo: currentFwMoving, date: registrationDate, position: 'delantero_movimiento', event: 'Registro' });

    localStorage.setItem('futbolines_elo_history', JSON.stringify(all));
  } catch {}
}

// ===== ACTIVITY LOG =====

export interface ActivityEntry {
  id: string;
  userId: string;
  type: 'match_win' | 'match_loss' | 'tournament_win' | 'mvp' | 'division_up' | 'division_down';
  description: string;
  eloChange?: number;
  date: string;
}

export function getActivityLog(userId: string, limit: number = 20): ActivityEntry[] {
  try {
    const all: ActivityEntry[] = JSON.parse(localStorage.getItem('futbolines_activity_log') || '[]');
    return all.filter(e => e.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
  } catch { return []; }
}

export function addActivityEntry(entry: Omit<ActivityEntry, 'id'>) {
  if (isGuestPlayer(entry.userId)) return;
  try {
    const all: ActivityEntry[] = JSON.parse(localStorage.getItem('futbolines_activity_log') || '[]');
    all.push({ ...entry, id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` });
    localStorage.setItem('futbolines_activity_log', JSON.stringify(all));
  } catch {}
}

// ===== RIVALRIES =====

export interface Rivalry {
  opponentId: string;
  opponentName: string;
  encounters: number;
  wins: number;
  losses: number;
}

export function getPlayerRivalries(userId: string): Rivalry[] {
  const opponents: Record<string, { name: string; encounters: number; wins: number; losses: number }> = {};
  
  MOCK_PAIRS.forEach(pair => {
    const isGk = pair.goalkeeper.userId === userId;
    const isFw = pair.forward.userId === userId;
    if (!isGk && !isFw) return;
    
    const sameT = MOCK_PAIRS.filter(p => p.tournamentId === pair.tournamentId && p.id !== pair.id);
    sameT.forEach(opPair => {
      [opPair.goalkeeper, opPair.forward].forEach(opp => {
        if (opp.userId === userId) return;
        if (!opponents[opp.userId]) opponents[opp.userId] = { name: opp.displayName, encounters: 0, wins: 0, losses: 0 };
      });
    });
  });
  
  return Object.entries(opponents)
    .filter(([_, data]) => data.encounters > 0)
    .map(([opponentId, data]) => ({ opponentId, opponentName: data.name, ...data }))
    .sort((a, b) => b.encounters - a.encounters)
    .slice(0, 5);
}

// ===== TEAM MATCHES =====

const TEAM_MATCHES_KEY = 'futbolines_team_matches';

export function getTeamMatches(): TeamMatch[] {
  try { return JSON.parse(localStorage.getItem(TEAM_MATCHES_KEY) || '[]'); } catch { return []; }
}

export function saveTeamMatch(match: TeamMatch) {
  const matches = getTeamMatches();
  matches.push(match);
  localStorage.setItem(TEAM_MATCHES_KEY, JSON.stringify(matches));
}

export function updateTeamMatch(matchId: string, updates: Partial<TeamMatch>) {
  const matches = getTeamMatches();
  const idx = matches.findIndex(m => m.id === matchId);
  if (idx >= 0) {
    matches[idx] = { ...matches[idx], ...updates };
    localStorage.setItem(TEAM_MATCHES_KEY, JSON.stringify(matches));
  }
}

// ===== TEAM LEAGUES =====

const TEAM_LEAGUES_KEY = 'futbolines_team_leagues';

export function getTeamLeagues(): TeamLeague[] {
  try { return JSON.parse(localStorage.getItem(TEAM_LEAGUES_KEY) || '[]'); } catch { return []; }
}

export function saveTeamLeague(league: TeamLeague) {
  const leagues = getTeamLeagues();
  leagues.push(league);
  localStorage.setItem(TEAM_LEAGUES_KEY, JSON.stringify(leagues));
}

export function updateTeamLeague(leagueId: string, updates: Partial<TeamLeague>) {
  const leagues = getTeamLeagues();
  const idx = leagues.findIndex(l => l.id === leagueId);
  if (idx >= 0) {
    leagues[idx] = { ...leagues[idx], ...updates };
    localStorage.setItem(TEAM_LEAGUES_KEY, JSON.stringify(leagues));
  }
}

export function getTeamLeagueStandings(leagueId: string): TeamLeagueStanding[] {
  const matches = getTeamMatches().filter(m => m.leagueId === leagueId && m.status === 'finalizado');
  const league = getTeamLeagues().find(l => l.id === leagueId);
  if (!league) return [];
  
  const standings: Record<string, TeamLeagueStanding> = {};
  league.teamIds.forEach(teamId => {
    standings[teamId] = { teamId, played: 0, wins: 0, losses: 0, points: 0, pairingDiff: 0 };
  });
  
  matches.forEach(match => {
    if (!standings[match.team1Id] || !standings[match.team2Id]) return;
    standings[match.team1Id].played++;
    standings[match.team2Id].played++;
    
    const t1Wins = match.pairings.filter(p => p.winnerId === 'team1').length;
    const t2Wins = match.pairings.filter(p => p.winnerId === 'team2').length;
    
    if (match.winnerId === match.team1Id) {
      standings[match.team1Id].wins++;
      standings[match.team1Id].points += 3;
      standings[match.team2Id].losses++;
    } else if (match.winnerId === match.team2Id) {
      standings[match.team2Id].wins++;
      standings[match.team2Id].points += 3;
      standings[match.team1Id].losses++;
    }
    
    standings[match.team1Id].pairingDiff += t1Wins - t2Wins;
    standings[match.team2Id].pairingDiff += t2Wins - t1Wins;
  });
  
  return Object.values(standings).sort((a, b) => b.points - a.points || b.pairingDiff - a.pairingDiff);
}

// ===== INDIVIDUAL ENROLLMENTS =====

const INDIVIDUAL_ENROLLMENTS_KEY = 'futbolines_individual_enrollments';

export function getIndividualEnrollments(tournamentId: string): IndividualEnrollment[] {
  try {
    const all: IndividualEnrollment[] = JSON.parse(localStorage.getItem(INDIVIDUAL_ENROLLMENTS_KEY) || '[]');
    return all.filter(e => e.tournamentId === tournamentId);
  } catch { return []; }
}

export function addIndividualEnrollment(enrollment: IndividualEnrollment) {
  try {
    const all: IndividualEnrollment[] = JSON.parse(localStorage.getItem(INDIVIDUAL_ENROLLMENTS_KEY) || '[]');
    if (all.some(e => e.tournamentId === enrollment.tournamentId && e.userId === enrollment.userId)) return;
    all.push(enrollment);
    localStorage.setItem(INDIVIDUAL_ENROLLMENTS_KEY, JSON.stringify(all));
  } catch {}
}

export function removeIndividualEnrollment(tournamentId: string, usrId: string) {
  try {
    const all: IndividualEnrollment[] = JSON.parse(localStorage.getItem(INDIVIDUAL_ENROLLMENTS_KEY) || '[]');
    const filtered = all.filter(e => !(e.tournamentId === tournamentId && e.userId === usrId));
    localStorage.setItem(INDIVIDUAL_ENROLLMENTS_KEY, JSON.stringify(filtered));
  } catch {}
}

// ===== MISSING EXPORTS (restored) =====

// Table helpers
export function getTableForVenue(venueId: string): VenueTable | undefined {
  return MOCK_TABLES.find(t => t.venueId === venueId);
}

export const TABLE_CONDITION_LABELS: Record<TableCondition, string> = {
  perfecta: 'Perfecta',
  buen_estado: 'Buen estado',
  estado_normal: 'Estado normal',
  deteriorada: 'Deteriorada',
  fuera_de_servicio: 'Fuera de servicio',
};

export const TABLE_CONDITION_COLORS: Record<TableCondition, string> = {
  perfecta: 'text-green-600 bg-green-100',
  buen_estado: 'text-blue-600 bg-blue-100',
  estado_normal: 'text-yellow-600 bg-yellow-100',
  deteriorada: 'text-orange-600 bg-orange-100',
  fuera_de_servicio: 'text-red-600 bg-red-100',
};

// Search players - returns full ranking data for consumer access
export function searchPlayers(query: string): (typeof MOCK_RANKINGS[0])[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return MOCK_RANKINGS
    .filter(r => r.displayName.toLowerCase().includes(q))
    .slice(0, 10);
}

// Find or create player (for tournament enrollment)
export function findOrCreatePlayer(displayName: string, _cityOrElo?: string | number, _position?: string): { userId: string; displayName: string; elo: number } {
  const existing = MOCK_RANKINGS.find(r => r.displayName.toLowerCase() === displayName.toLowerCase());
  if (existing) return { userId: existing.userId, displayName: existing.displayName, elo: existing.general };
  const guest = createGuestPlayer(displayName);
  return { userId: guest.id, displayName: guest.displayName, elo: 1500 };
}

export function findOrCreateRegisteredPlayer(displayName: string): { userId: string; displayName: string; elo: number } | null {
  const existing = MOCK_RANKINGS.find(r => r.displayName.toLowerCase() === displayName.toLowerCase());
  if (existing) return { userId: existing.userId, displayName: existing.displayName, elo: existing.general };
  const regUsers = getRegisteredUsers();
  const regUser = regUsers.find(u => u.displayName.toLowerCase() === displayName.toLowerCase());
  if (regUser) {
    ensureRankingEntry(regUser.id, regUser.displayName, regUser.city, regUser.postalCode);
    const ranking = MOCK_RANKINGS.find(r => r.userId === regUser.id);
    return { userId: regUser.id, displayName: regUser.displayName, elo: ranking?.general || 1500 };
  }
  return null;
}

// User team helpers
export function getUserTeam(userId: string): Team | null {
  const allMembers: TeamMember[] = JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || '[]');
  const membership = allMembers.find(m => m.userId === userId && m.status !== 'rechazada');
  if (membership) {
    return MOCK_TEAMS.find(t => t.id === membership.teamId) || null;
  }
  return MOCK_TEAMS.find(t => t.captainId === userId) || null;
}

// Team join requests
interface JoinRequest {
  id: string;
  teamId: string;
  userId: string;
  displayName: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  createdAt: string;
}

const JOIN_REQUESTS_KEY = 'futbolines_join_requests';

export function getTeamJoinRequests(teamId: string): JoinRequest[] {
  try {
    const all: JoinRequest[] = JSON.parse(localStorage.getItem(JOIN_REQUESTS_KEY) || '[]');
    return all.filter(r => r.teamId === teamId);
  } catch { return []; }
}

export function createJoinRequest(teamId: string, userId: string, displayName: string): { success: boolean; error?: string } {
  const all: JoinRequest[] = JSON.parse(localStorage.getItem(JOIN_REQUESTS_KEY) || '[]');
  if (all.some(r => r.teamId === teamId && r.userId === userId && r.status === 'pendiente')) {
    return { success: false, error: 'Ya tienes una solicitud pendiente' };
  }
  const req: JoinRequest = {
    id: `jr_${Date.now()}`, teamId, userId, displayName,
    status: 'pendiente', createdAt: new Date().toISOString(),
  };
  all.push(req);
  localStorage.setItem(JOIN_REQUESTS_KEY, JSON.stringify(all));
  return { success: true };
}

export function respondJoinRequest(requestId: string, accept: boolean) {
  const all: JoinRequest[] = JSON.parse(localStorage.getItem(JOIN_REQUESTS_KEY) || '[]');
  const req = all.find(r => r.id === requestId);
  if (req) {
    req.status = accept ? 'aceptada' : 'rechazada';
    localStorage.setItem(JOIN_REQUESTS_KEY, JSON.stringify(all));
    if (accept) {
      addTeamMember({
        id: `tm_${Date.now()}`, teamId: req.teamId, userId: req.userId,
        displayName: req.displayName, role: 'jugador', joinedAt: new Date().toISOString(), status: 'aceptada',
      });
    }
  }
}

// Team matches for a specific team
export function getTeamMatchesForTeam(teamId: string): TeamMatch[] {
  return getTeamMatches().filter(m => m.team1Id === teamId || m.team2Id === teamId);
}

export function createTeamMatch(team1IdOrMatch: string | TeamMatch, team2Id?: string, pairingsCount?: number) {
  if (typeof team1IdOrMatch === 'object') {
    saveTeamMatch(team1IdOrMatch);
    return;
  }
  const pairings: TeamMatchPairing[] = Array.from({ length: pairingsCount || 3 }, (_, idx) => ({
    id: `tmp_${Date.now()}_${idx}`,
    teamMatchId: '',
    pair1GoalkeeperName: '', pair1ForwardName: '',
    pair2GoalkeeperName: '', pair2ForwardName: '',
  }));
  const match: TeamMatch = {
    id: `tmatch_${Date.now()}`, team1Id: team1IdOrMatch, team2Id: team2Id!,
    pairings, status: 'pendiente', date: new Date().toISOString(),
  };
  match.pairings.forEach(p => p.teamMatchId = match.id);
  saveTeamMatch(match);
}

// User pending invites
export function getUserPendingInvites(userId: string): (TeamMember & { teamName: string })[] {
  try {
    const all: TeamMember[] = JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || '[]');
    return all
      .filter(m => m.userId === userId && m.status === 'pendiente')
      .map(m => {
        const team = MOCK_TEAMS.find(t => t.id === m.teamId);
        return { ...m, teamName: team?.name || 'Equipo desconocido' };
      });
  } catch { return []; }
}

// Team league creation
export function createTeamLeague(name: string, teamIds: string[], pairingsPerMatch: number = 3): TeamLeague {
  const league: TeamLeague = {
    id: `tl_${Date.now()}`, name, teamIds, pairingsPerMatch,
    status: 'activa', createdAt: new Date().toISOString(),
  };
  saveTeamLeague(league);
  return league;
}

// Generate league matchdays (round-robin)
export function generateLeagueMatchdays(leagueId: string) {
  const league = getTeamLeagues().find(l => l.id === leagueId);
  if (!league) return;
  const teams = league.teamIds;
  let matchday = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const emptyPairings: TeamMatchPairing[] = Array.from({ length: league.pairingsPerMatch }, (_, idx) => ({
        id: `tmp_${Date.now()}_${idx}_${i}_${j}`,
        teamMatchId: '',
        pair1GoalkeeperName: '', pair1ForwardName: '',
        pair2GoalkeeperName: '', pair2ForwardName: '',
      }));
      const match: TeamMatch = {
        id: `tmatch_${Date.now()}_${i}_${j}`, team1Id: teams[i], team2Id: teams[j],
        leagueId, matchday: matchday++, pairings: emptyPairings, status: 'pendiente', date: new Date().toISOString(),
      };
      match.pairings.forEach(p => p.teamMatchId = match.id);
      saveTeamMatch(match);
    }
  }
}

export function updateTeamMatchPairing(matchId: string, pairingId: string, updates: Partial<TeamMatchPairing>) {
  const matches = getTeamMatches();
  const match = matches.find(m => m.id === matchId);
  if (!match) return;
  const pairing = match.pairings.find(p => p.id === pairingId);
  if (pairing) Object.assign(pairing, updates);
  localStorage.setItem(TEAM_MATCHES_KEY, JSON.stringify(matches));
}

export function finalizeTeamMatch(matchId: string) {
  const matches = getTeamMatches();
  const match = matches.find(m => m.id === matchId);
  if (!match) return;
  const t1Wins = match.pairings.filter(p => p.winnerId === 'team1').length;
  const t2Wins = match.pairings.filter(p => p.winnerId === 'team2').length;
  match.winnerId = t1Wins >= t2Wins ? match.team1Id : match.team2Id;
  match.status = 'finalizado';
  localStorage.setItem(TEAM_MATCHES_KEY, JSON.stringify(matches));
}

export function fixTeamMemberConsistency(teamId: string) {
  const members = getTeamMembers(teamId);
  const team = MOCK_TEAMS.find(t => t.id === teamId);
  if (!team) return;
  if (!members.some(m => m.userId === team.captainId)) {
    const ranking = MOCK_RANKINGS.find(r => r.userId === team.captainId);
    addTeamMember({
      id: `tm_fix_${Date.now()}`, teamId, userId: team.captainId,
      displayName: ranking?.displayName || 'Capitán', role: 'capitan',
      joinedAt: team.createdAt, status: 'aceptada',
    });
  }
}

// Generate balanced pairs from individual enrollments
export function generateBalancedPairs(tournamentId: string): TournamentPair[] {
  const enrollments = getIndividualEnrollments(tournamentId);
  const sorted = [...enrollments].sort((a, b) => b.elo - a.elo);
  const pairs: TournamentPair[] = [];
  for (let i = 0; i < Math.floor(sorted.length / 2); i++) {
    const gk = sorted[i];
    const fw = sorted[sorted.length - 1 - i];
    pairs.push({
      id: `gen_p_${Date.now()}_${i}`, tournamentId,
      goalkeeper: { userId: gk.userId, displayName: gk.displayName, elo: gk.elo },
      forward: { userId: fw.userId, displayName: fw.displayName, elo: fw.elo },
      seed: i + 1, status: 'inscrita',
    });
  }
  return pairs;
}

export function generateRandomPairs(tournamentId: string): TournamentPair[] {
  const enrollments = getIndividualEnrollments(tournamentId);
  const shuffled = [...enrollments].sort(() => Math.random() - 0.5);
  const pairs: TournamentPair[] = [];
  for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
    const gk = shuffled[i * 2];
    const fw = shuffled[i * 2 + 1];
    if (!gk || !fw) break;
    pairs.push({
      id: `gen_r_${Date.now()}_${i}`, tournamentId,
      goalkeeper: { userId: gk.userId, displayName: gk.displayName, elo: gk.elo },
      forward: { userId: fw.userId, displayName: fw.displayName, elo: fw.elo },
      seed: i + 1, status: 'inscrita',
    });
  }
  return pairs;
}

export function confirmGeneratedPairs(pairs: TournamentPair[]) {
  pairs.forEach(p => {
    if (!MOCK_PAIRS.some(mp => mp.id === p.id)) {
      MOCK_PAIRS.push(p);
    }
  });
  persistPairs();
}
