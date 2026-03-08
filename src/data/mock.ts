import { Venue, VenueTable, Tournament, PlayerRating, User, Team, TeamMember, TeamStats, TournamentPair, Position, TableCondition, TableBrand, Verification, VerificationType, AppNotification, PlayerType, Season, Achievement, AchievementId, PlayerAchievement, VenueLeague, ResultCorrection } from '@/types';

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
  const newUser: RegisteredUser = {
    ...data,
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    playerType: 'registrado',
    createdAt: new Date().toISOString().split('T')[0],
  };
  users.push(newUser);
  saveRegisteredUsers(users);
  setCurrentUser(newUser);
  ensureRankingEntry(newUser.id, newUser.displayName, newUser.city, newUser.postalCode, newUser.preferredPosition, newUser.preferredStyle, newUser.preferredTable);
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
  if (!existing) {
    MOCK_RANKINGS.push({
      userId, displayName, city: city || '', postalCode,
      general: 1500, asGoalkeeper: 1500, asForward: 1500,
      byTable: {}, byStyle: { parado: 1500, movimiento: 1500 },
      wins: 0, losses: 0, tournamentsPlayed: 0, tournamentsWon: 0,
      mvpCount: 0, currentStreak: 0, bestStreak: 0,
      preferredPosition, preferredStyle, preferredTable,
      playerType: 'registrado',
    });
    persistRankings();
  }
}

export function loginUser(email: string, password: string): { success: boolean; error?: string; user?: RegisteredUser } {
  const users = getRegisteredUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { success: false, error: 'Email o contraseña incorrectos.' };
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
    // Set all pairs to pending
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
  // Remove members
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
    // Avoid duplicates
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
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
  if (!tournament) return;
  tournament.mvpPlayerId = playerId;
  tournament.mvpPlayerName = playerName;

  const pairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId);
  const allElos: number[] = [];
  pairs.forEach(p => { allElos.push(p.goalkeeper.elo, p.forward.elo); });
  const avgElo = allElos.length > 0 ? allElos.reduce((a, b) => a + b, 0) / allElos.length : 1500;
  const bonus = Math.round(5 + Math.max(0, (avgElo - 1500)) * 0.02);
  const cappedBonus = Math.min(bonus, 20);

  const ranking = MOCK_RANKINGS.find(r => r.userId === playerId);
  if (ranking) {
    ranking.general += cappedBonus;
    ranking.mvpCount = (ranking.mvpCount || 0) + 1;
  }

  // Achievement: MVP
  checkAndGrantAchievement(playerId, 'mvp_tournament');
  persistRankings();
  persistTournaments();
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
        // Achievements
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
  // Deactivate current active
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

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first_tournament_win', name: 'Primera victoria', description: 'Gana tu primer torneo', icon: '🏆' },
  { id: 'five_tournament_wins', name: 'Pentacampeón', description: 'Gana 5 torneos', icon: '⭐' },
  { id: 'ten_tournament_wins', name: 'Leyenda', description: 'Gana 10 torneos', icon: '👑' },
  { id: 'ten_win_streak', name: 'Imparable', description: 'Racha de 10 victorias', icon: '🔥' },
  { id: 'mvp_tournament', name: 'MVP', description: 'Ser jugador del torneo', icon: '🌟' },
  { id: 'play_3_venues', name: 'Explorador', description: 'Jugar en 3 bares distintos', icon: '🗺️' },
  { id: 'play_5_tables', name: 'Versátil', description: 'Jugar en 5 mesas distintas', icon: '🎯' },
];

function getPlayerAchievements(userId: string): PlayerAchievement[] {
  try {
    const all: Record<string, PlayerAchievement[]> = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
    return all[userId] || [];
  } catch { return []; }
}

function savePlayerAchievement(userId: string, achievementId: AchievementId) {
  try {
    const all: Record<string, PlayerAchievement[]> = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
    if (!all[userId]) all[userId] = [];
    if (all[userId].some(a => a.achievementId === achievementId)) return;
    all[userId].push({ achievementId, unlockedAt: new Date().toISOString() });
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(all));
  } catch {}
}

export function checkAndGrantAchievement(userId: string, achievementId: AchievementId) {
  savePlayerAchievement(userId, achievementId);
}

export function setTournamentMvp(tournamentId: string, mvpUserId: string, mvpName: string) {
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
  if (!tournament) return;
  tournament.mvpPlayerId = mvpUserId;
  tournament.mvpPlayerName = mvpName;
  if (!isGuestPlayer(mvpUserId)) {
    const ranking = MOCK_RANKINGS.find(r => r.userId === mvpUserId);
    if (ranking) {
      ranking.mvpCount = (ranking.mvpCount || 0) + 1;
      // MVP ELO bonus
      ranking.general += 15;
      ranking.asGoalkeeper += 10;
      ranking.asForward += 10;
    }
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
  // Check achievements for all participants
  const tPairs = MOCK_PAIRS.filter(p => p.tournamentId === tournamentId);
  tPairs.forEach(p => {
    [p.goalkeeper.userId, p.forward.userId].forEach(uid => {
      if (!isGuestPlayer(uid)) {
        checkStreakAchievement(uid);
        checkVenueTableAchievements(uid);
      }
    });
  });
}

export function getUserAchievements(userId: string): (Achievement & { unlockedAt: string })[] {
  const playerAch = getPlayerAchievements(userId);
  return playerAch.map(pa => {
    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === pa.achievementId)!;
    return { ...def, unlockedAt: pa.unlockedAt };
  }).filter(Boolean);
}

// Check streak achievement
export function checkStreakAchievement(userId: string) {
  const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
  if (ranking && ranking.currentStreak >= 10) {
    checkAndGrantAchievement(userId, 'ten_win_streak');
  }
}

// Check venue/table achievements
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
    MOCK_PAIRS.filter(p => p.tournamentId === tId && p.status !== 'ganadora').forEach(p => {
      [p.goalkeeper, p.forward].forEach(m => {
        if (!playerStats[m.userId]) playerStats[m.userId] = { displayName: m.displayName, points: 0, wins: 0, losses: 0 };
        playerStats[m.userId].points += 1;
        playerStats[m.userId].losses++;
      });
    });
  });

  return Object.entries(playerStats).map(([userId, data]) => ({ userId, ...data })).sort((a, b) => b.points - a.points);
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

// ===== MOCK DATA =====

export const MOCK_USER: User = {
  id: 'u1', email: 'carlos@ejemplo.com', nickname: 'CarlosGK', displayName: 'Carlos García',
  city: 'Madrid', postalCode: '28001', preferredPosition: 'portero', preferredStyle: 'parado',
  preferredTable: 'Presas', playerType: 'registrado', createdAt: '2024-01-15',
};

export const MOCK_VENUES: Venue[] = [
  { id: 'v1', name: 'Bar El Rincón', address: 'C/ Gran Vía 42', city: 'Madrid', photos: [], status: 'activo', verificationLevel: 'verificado', confidenceScore: 92, lastVerified: '2026-02-20', verificationCount: 5, createdBy: 'u1', createdAt: '2024-06-01' },
  { id: 'v2', name: 'Café Sport', address: 'Av. Diagonal 310', city: 'Barcelona', photos: [], status: 'activo', verificationLevel: 'verificado', confidenceScore: 85, lastVerified: '2026-01-10', verificationCount: 3, createdBy: 'u2', createdAt: '2024-07-15' },
  { id: 'v3', name: 'La Taberna del Gol', address: 'C/ Sierpes 18', city: 'Sevilla', photos: [], status: 'activo', verificationLevel: 'no_verificado', confidenceScore: 60, lastVerified: '2025-08-01', verificationCount: 0, createdBy: 'u3', createdAt: '2024-03-20' },
  { id: 'v4', name: 'Txoko Futbolín', address: 'C/ Ledesma 12', city: 'Bilbao', photos: [], status: 'activo', verificationLevel: 'verificado', confidenceScore: 95, lastVerified: '2026-03-01', verificationCount: 7, createdBy: 'u1', createdAt: '2024-09-01' },
  { id: 'v5', name: 'Bar La Esquina', address: 'C/ Colón 22', city: 'Valencia', photos: [], status: 'pendiente', verificationLevel: 'en_disputa', confidenceScore: 40, lastVerified: '2025-06-15', verificationCount: 1, createdBy: 'u2', createdAt: '2024-11-01' },
  { id: 'v6', name: 'Cervecería Gol Norte', address: 'C/ Princesa 8', city: 'Madrid', photos: [], status: 'activo', verificationLevel: 'verificado', confidenceScore: 88, lastVerified: '2026-02-28', verificationCount: 4, createdBy: 'u3', createdAt: '2025-01-10' },
];

export const MOCK_TABLES: VenueTable[] = [
  { id: 't1', venueId: 'v1', brand: 'Presas', quantity: 2, condition: 'buen_estado', photos: [] },
  { id: 't2', venueId: 'v2', brand: 'Tsunami', quantity: 1, condition: 'perfecta', photos: [] },
  { id: 't3', venueId: 'v3', brand: 'Val', quantity: 1, condition: 'estado_normal', photos: [] },
  { id: 't4', venueId: 'v4', brand: 'Presas', quantity: 3, condition: 'perfecta', photos: [] },
  { id: 't5', venueId: 'v5', brand: 'Garlando', quantity: 1, condition: 'deteriorada', photos: [] },
  { id: 't6', venueId: 'v6', brand: 'Infinity', quantity: 2, condition: 'buen_estado', photos: [] },
];

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'to1', name: 'Torneo Gran Vía', description: 'Torneo mensual de parejas en el corazón de Madrid. Premios para los 3 primeros. Consumición incluida.',
    date: '2026-03-15', time: '18:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_simple', pairingMode: 'inscripcion', maxPairs: 16,
    hasWaitlist: true, entryFee: 10, prizes: '1º: 100€ | 2º: 50€ | 3º: 25€',
    organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'en_curso', hasCategories: false, categories: [], createdAt: '2026-03-01',
  },
  {
    id: 'to2', name: 'Liga Diagonal', description: 'Liguilla de primavera en Café Sport. Formato round robin.',
    date: '2026-03-22', time: '17:00', venueId: 'v2', venueName: 'Café Sport',
    city: 'Barcelona', tableBrand: 'Tsunami', playStyle: 'movimiento',
    format: 'round_robin', pairingMode: 'inscripcion', maxPairs: 8,
    hasWaitlist: false, entryFee: 5,
    organizerId: 'u2', organizerName: 'Laura Martínez', requiresApproval: true,
    status: 'abierto', hasCategories: false, categories: [], createdAt: '2026-03-05',
  },
  {
    id: 'to3', name: 'Txoko Open', description: 'El torneo más grande del norte. Eliminación doble, categorías Máster y Pro.',
    date: '2026-04-05', time: '16:00', venueId: 'v4', venueName: 'Txoko Futbolín',
    city: 'Bilbao', tableBrand: 'Presas', playStyle: 'parado',
    format: 'eliminacion_doble', pairingMode: 'equilibradas', maxPairs: 32,
    hasWaitlist: true, entryFee: 15, prizes: '1º: 300€ | 2º: 150€',
    organizerId: 'u3', organizerName: 'Mikel Etxebarria', requiresApproval: false,
    status: 'abierto', hasCategories: true,
    categories: [
      { id: 'c3', tournamentId: 'to3', name: 'Máster', maxPairs: 16 },
      { id: 'c4', tournamentId: 'to3', name: 'Pro', maxPairs: 16 },
    ],
    createdAt: '2026-03-02',
  },
  {
    id: 'to4', name: 'Rey de la Pista Madrid', description: 'Formato Rey de la pista: la pareja ganadora permanece, la perdedora sale.',
    date: '2026-03-20', time: '19:00', venueId: 'v1', venueName: 'Bar El Rincón',
    city: 'Madrid', tableBrand: 'Presas', playStyle: 'parado',
    format: 'rey_mesa', pairingMode: 'inscripcion', maxPairs: 10,
    hasWaitlist: false, entryFee: 5,
    organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'en_curso', hasCategories: false, categories: [], createdAt: '2026-03-10',
  },
  {
    id: 'to5', name: 'Copa Grupos Madrid', description: 'Torneo de grupos + cuadro final. Fase de grupos con round robin, luego eliminación.',
    date: '2026-04-12', time: '17:00', venueId: 'v6', venueName: 'Cervecería Gol Norte',
    city: 'Madrid', tableBrand: 'Infinity', playStyle: 'parado',
    format: 'grupos_cuadro', pairingMode: 'inscripcion', maxPairs: 12,
    hasWaitlist: false, entryFee: 10,
    organizerId: 'u1', organizerName: 'Carlos García', requiresApproval: false,
    status: 'en_curso', hasCategories: false, categories: [], createdAt: '2026-03-08',
    groupSize: 3, qualifyPerGroup: 2,
  },
];

export const MOCK_PAIRS: TournamentPair[] = [
  { id: 'p1', tournamentId: 'to1', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 }, seed: 1, status: 'confirmada' },
  { id: 'p2', tournamentId: 'to1', goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 }, forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 }, seed: 2, status: 'confirmada' },
  { id: 'p3', tournamentId: 'to1', goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 3, status: 'inscrita' },
  { id: 'p4', tournamentId: 'to1', goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 }, forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 }, seed: 4, status: 'inscrita' },
  { id: 'p5', tournamentId: 'to1', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 5, status: 'inscrita' },
  { id: 'p6', tournamentId: 'to1', goalkeeper: { userId: 'u2', displayName: 'Laura Martínez', elo: 1780 }, forward: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1680 }, seed: 6, status: 'inscrita' },
  // Rey de la pista pairs
  { id: 'pk1', tournamentId: 'to4', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 }, seed: 1, status: 'confirmada' },
  { id: 'pk2', tournamentId: 'to4', goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 }, forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 }, seed: 2, status: 'confirmada' },
  { id: 'pk3', tournamentId: 'to4', goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 3, status: 'inscrita' },
  { id: 'pk4', tournamentId: 'to4', goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 }, forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 }, seed: 4, status: 'inscrita' },
  // Grupos + Cuadro pairs (to5)
  { id: 'pg1', tournamentId: 'to5', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 }, seed: 1, status: 'confirmada' },
  { id: 'pg2', tournamentId: 'to5', goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 }, forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 }, seed: 2, status: 'confirmada' },
  { id: 'pg3', tournamentId: 'to5', goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 3, status: 'confirmada' },
  { id: 'pg4', tournamentId: 'to5', goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 }, forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 }, seed: 4, status: 'confirmada' },
  { id: 'pg5', tournamentId: 'to5', goalkeeper: { userId: 'u2', displayName: 'Laura Martínez', elo: 1780 }, forward: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1680 }, seed: 5, status: 'confirmada' },
  { id: 'pg6', tournamentId: 'to5', goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 }, forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 }, seed: 6, status: 'confirmada' },
];

export const MOCK_RANKINGS: (PlayerRating & { displayName: string; city: string; postalCode?: string; avatarUrl?: string; preferredPosition?: Position; preferredStyle?: 'parado' | 'movimiento'; preferredTable?: TableBrand; playerType?: PlayerType })[] = [
  { userId: 'u1', displayName: 'Carlos García', city: 'Madrid', postalCode: '28001', general: 1850, asGoalkeeper: 1900, asForward: 1750, byTable: { Presas: 1880, Tsunami: 1700 }, byStyle: { parado: 1870, movimiento: 1780 }, wins: 142, losses: 58, tournamentsPlayed: 34, tournamentsWon: 8, mvpCount: 5, currentStreak: 3, bestStreak: 8, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u2', displayName: 'Laura Martínez', city: 'Barcelona', postalCode: '08001', general: 1820, asGoalkeeper: 1780, asForward: 1860, byTable: { Tsunami: 1850, Presas: 1750 }, byStyle: { parado: 1790, movimiento: 1850 }, wins: 128, losses: 52, tournamentsPlayed: 30, tournamentsWon: 7, mvpCount: 3, currentStreak: 1, bestStreak: 6, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Tsunami', playerType: 'registrado' },
  { userId: 'u3', displayName: 'Mikel Etxebarria', city: 'Bilbao', postalCode: '48001', general: 1790, asGoalkeeper: 1830, asForward: 1720, byTable: { Presas: 1820 }, byStyle: { parado: 1810, movimiento: 1740 }, wins: 115, losses: 65, tournamentsPlayed: 28, tournamentsWon: 5, mvpCount: 2, currentStreak: 0, bestStreak: 5, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u4', displayName: 'Ana López', city: 'Sevilla', postalCode: '41001', general: 1750, asGoalkeeper: 1700, asForward: 1800, byTable: { Val: 1780 }, byStyle: { parado: 1720, movimiento: 1780 }, wins: 98, losses: 62, tournamentsPlayed: 25, tournamentsWon: 4, mvpCount: 1, currentStreak: 2, bestStreak: 4, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Val', playerType: 'registrado' },
  { userId: 'u5', displayName: 'Pedro Sánchez', city: 'Valencia', postalCode: '46001', general: 1720, asGoalkeeper: 1740, asForward: 1680, byTable: { Garlando: 1750 }, byStyle: { parado: 1730, movimiento: 1700 }, wins: 89, losses: 71, tournamentsPlayed: 22, tournamentsWon: 3, mvpCount: 0, currentStreak: 0, bestStreak: 3, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Garlando', playerType: 'registrado' },
  { userId: 'u6', displayName: 'María Fernández', city: 'Madrid', postalCode: '28002', general: 1700, asGoalkeeper: 1650, asForward: 1750, byTable: { Presas: 1710, Infinity: 1690 }, byStyle: { parado: 1680, movimiento: 1720 }, wins: 82, losses: 68, tournamentsPlayed: 20, tournamentsWon: 2, mvpCount: 1, currentStreak: 1, bestStreak: 4, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u7', displayName: 'Javi Ruiz', city: 'Bilbao', postalCode: '48002', general: 1680, asGoalkeeper: 1720, asForward: 1620, byTable: { Presas: 1700 }, byStyle: { parado: 1700, movimiento: 1650 }, wins: 76, losses: 74, tournamentsPlayed: 18, tournamentsWon: 2, mvpCount: 0, currentStreak: 0, bestStreak: 3, preferredPosition: 'portero', preferredStyle: 'parado', preferredTable: 'Presas', playerType: 'registrado' },
  { userId: 'u8', displayName: 'Elena Torres', city: 'Barcelona', postalCode: '08002', general: 1650, asGoalkeeper: 1600, asForward: 1700, byTable: { Tsunami: 1680 }, byStyle: { parado: 1630, movimiento: 1670 }, wins: 70, losses: 60, tournamentsPlayed: 16, tournamentsWon: 1, mvpCount: 0, currentStreak: 2, bestStreak: 3, preferredPosition: 'delantero', preferredStyle: 'movimiento', preferredTable: 'Tsunami', playerType: 'registrado' },
];

// ===== PERSISTENCE LAYER =====
// Apply saved overrides from localStorage on module load

export function persistRankings() {
  localStorage.setItem(RANKINGS_OVERRIDES_KEY, JSON.stringify(MOCK_RANKINGS));
}

export function persistTournaments() {
  localStorage.setItem(TOURNAMENTS_OVERRIDES_KEY, JSON.stringify(MOCK_TOURNAMENTS));
}

export function persistPairs() {
  localStorage.setItem(PAIRS_OVERRIDES_KEY, JSON.stringify(MOCK_PAIRS));
}

// Restore rankings overrides
try {
  const savedRankings = localStorage.getItem(RANKINGS_OVERRIDES_KEY);
  if (savedRankings) {
    const parsed = JSON.parse(savedRankings);
    if (Array.isArray(parsed)) {
      // Merge: update existing entries + add new ones
      parsed.forEach((saved: typeof MOCK_RANKINGS[0]) => {
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
      // Replace entire pairs array content
      MOCK_PAIRS.length = 0;
      parsed.forEach((p: TournamentPair) => MOCK_PAIRS.push(p));
    }
  }
} catch {}

export const MOCK_TEAMS: Team[] = [
  { id: 'team1', name: 'Madrid Futbolín Club', city: 'Madrid', captainId: 'u1', elo: 1820, description: 'El equipo de referencia en Madrid', createdAt: '2025-01-01' },
  { id: 'team2', name: 'BCN Foosballers', city: 'Barcelona', captainId: 'u2', elo: 1790, description: 'Pasión por el futbolín en Barcelona', createdAt: '2025-02-15' },
  { id: 'team3', name: 'Euskal Kicker', city: 'Bilbao', captainId: 'u3', elo: 1760, description: 'Fuerza vasca en la mesa', createdAt: '2025-03-01' },
];

export function getTableForVenue(venueId: string): VenueTable | undefined {
  return MOCK_TABLES.find(t => t.venueId === venueId);
}

export const TABLE_BRAND_COLORS: Record<string, string> = {
  Presas: '#2563eb', Tsunami: '#0891b2', Infinity: '#7c3aed', Val: '#059669',
  Garlando: '#dc2626', Leonhart: '#ca8a04', Tornado: '#ea580c', Otro: '#6b7280',
};

export const TABLE_BRAND_SHORT: Record<string, string> = {
  Presas: 'PRE', Tsunami: 'TSU', Infinity: 'INF', Val: 'VAL',
  Garlando: 'GAR', Leonhart: 'LEO', Tornado: 'TOR', Otro: '?',
};

export const TABLE_CONDITION_LABELS: Record<string, string> = {
  perfecta: 'Perfecta', buen_estado: 'Buen estado', estado_normal: 'Estado normal',
  deteriorada: 'Deteriorada', fuera_de_servicio: 'Fuera de servicio',
};

export const TABLE_CONDITION_COLORS: Record<string, string> = {
  perfecta: 'bg-success text-success-foreground', buen_estado: 'bg-primary/10 text-primary',
  estado_normal: 'bg-muted text-muted-foreground', deteriorada: 'bg-warning/20 text-warning-foreground',
  fuera_de_servicio: 'bg-destructive/10 text-destructive',
};

export function searchPlayers(query: string) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return MOCK_RANKINGS.filter(r => r.displayName.toLowerCase().includes(q));
}

export function findOrCreatePlayer(displayName: string, city: string = '', position?: Position): { userId: string; displayName: string; elo: number; playerType: PlayerType } {
  const existing = MOCK_RANKINGS.find(r => r.displayName.toLowerCase() === displayName.toLowerCase());
  if (existing) {
    let elo = existing.general;
    if (position === 'portero') elo = existing.asGoalkeeper;
    else if (position === 'delantero') elo = existing.asForward;
    return { userId: existing.userId, displayName: existing.displayName, elo, playerType: existing.playerType || 'registrado' };
  }
  const guests = getGuestPlayers();
  const existingGuest = guests.find(g => g.displayName.toLowerCase() === displayName.toLowerCase());
  if (existingGuest) return { userId: existingGuest.id, displayName: existingGuest.displayName, elo: 1500, playerType: 'invitado' };
  const guest = createGuestPlayer(displayName);
  return { userId: guest.id, displayName: guest.displayName, elo: 1500, playerType: 'invitado' };
}

export function findOrCreateRegisteredPlayer(displayName: string, city: string = '', position?: Position): { userId: string; displayName: string; elo: number; playerType: PlayerType } {
  const existing = MOCK_RANKINGS.find(r => r.displayName.toLowerCase() === displayName.toLowerCase());
  if (existing) {
    let elo = existing.general;
    if (position === 'portero') elo = existing.asGoalkeeper;
    else if (position === 'delantero') elo = existing.asForward;
    return { userId: existing.userId, displayName: existing.displayName, elo, playerType: existing.playerType || 'registrado' };
  }
  const BASE_ELO = 1500;
  const newUserId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  MOCK_RANKINGS.push({
    userId: newUserId, displayName, city,
    general: BASE_ELO, asGoalkeeper: BASE_ELO, asForward: BASE_ELO,
    byTable: {}, byStyle: { parado: BASE_ELO, movimiento: BASE_ELO },
    wins: 0, losses: 0, tournamentsPlayed: 0, tournamentsWon: 0,
    mvpCount: 0, currentStreak: 0, bestStreak: 0, playerType: 'registrado',
  });
  return { userId: newUserId, displayName, elo: BASE_ELO, playerType: 'registrado' };
}

export function getFrequentPartners(userId: string): { partnerId: string; partnerName: string; count: number }[] {
  const partnerMap: Record<string, { name: string; count: number }> = {};
  MOCK_PAIRS.forEach(pair => {
    if (pair.goalkeeper.userId === userId && pair.forward.userId !== userId) {
      const key = pair.forward.userId;
      if (!partnerMap[key]) partnerMap[key] = { name: pair.forward.displayName, count: 0 };
      partnerMap[key].count++;
    }
    if (pair.forward.userId === userId && pair.goalkeeper.userId !== userId) {
      const key = pair.goalkeeper.userId;
      if (!partnerMap[key]) partnerMap[key] = { name: pair.goalkeeper.displayName, count: 0 };
      partnerMap[key].count++;
    }
  });
  return Object.entries(partnerMap).map(([partnerId, data]) => ({ partnerId, partnerName: data.name, count: data.count })).sort((a, b) => b.count - a.count);
}
