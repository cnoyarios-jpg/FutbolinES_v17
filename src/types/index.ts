// ===== ENUMS =====

export type TableBrand = 'Presas' | 'Tsunami' | 'Infinity' | 'Val' | 'Garlando' | 'Leonhart' | 'Tornado' | 'Otro';
export type TableCondition = 'perfecta' | 'buen_estado' | 'estado_normal' | 'deteriorada' | 'fuera_de_servicio';
export type PlayStyle = 'parado' | 'movimiento';
export type Position = 'portero' | 'delantero';
export type VenueStatus = 'activo' | 'pendiente' | 'cambiado' | 'cerrado_temporal' | 'cerrado';
export type VerificationLevel = 'verificado' | 'no_verificado' | 'en_disputa';
export type TournamentFormat = 'eliminacion_simple' | 'eliminacion_doble' | 'round_robin' | 'grupos_cuadro' | 'rey_mesa';
export type PairingMode = 'inscripcion' | 'equilibradas' | 'random';
export type TournamentStatus = 'borrador' | 'abierto' | 'en_curso' | 'finalizado' | 'cancelado';
export type MatchStatus = 'pendiente' | 'en_curso' | 'finalizado' | 'confirmado';
export type TeamRole = 'capitan' | 'jugador';
export type VerificationType = 'confirm' | 'report_worse' | 'report_closed';
export type CheckInStatus = 'pendiente' | 'confirmado' | 'ausente';
export type PairConfirmationStatus = 'pendiente' | 'aceptada' | 'rechazada';
export type PlayerType = 'registrado' | 'invitado';

// ===== USERS =====

export interface User {
  id: string;
  email: string;
  nickname: string;
  displayName: string;
  city?: string;
  postalCode?: string;
  avatarUrl?: string;
  preferredPosition: Position;
  preferredStyle: PlayStyle;
  preferredTable?: TableBrand;
  playerType: PlayerType;
  createdAt: string;
}

// ===== VENUES =====

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  photos: string[];
  description?: string;
  observations?: string;
  status: VenueStatus;
  verificationLevel: VerificationLevel;
  lastVerified?: string;
  confidenceScore: number;
  verificationCount: number;
  createdBy: string;
  createdAt: string;
}

export interface VenueTable {
  id: string;
  venueId: string;
  brand: TableBrand;
  quantity: number;
  condition: TableCondition;
  photos: string[];
}

export interface Verification {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  type: VerificationType;
  comment?: string;
  photoUrl?: string;
  createdAt: string;
}

// ===== TOURNAMENTS =====

export interface Tournament {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  venueId: string;
  venueName: string;
  city: string;
  tableBrand: TableBrand;
  playStyle: PlayStyle;
  format: TournamentFormat;
  pairingMode: PairingMode;
  maxPairs: number;
  entryFee?: number;
  prizes?: string;
  organizerId: string;
  organizerName: string;
  requiresApproval: boolean;
  status: TournamentStatus;
  hasCategories: boolean;
  categories: TournamentCategory[];
  createdAt: string;
  kingLaps?: number;
  groupSize?: number;
  qualifyPerGroup?: number;
  mvpPlayerId?: string;
  mvpPlayerName?: string;
  checkInOpen?: boolean;
  correctedMatches?: string[];
  isTeamTournament?: boolean;
  enrolledTeamIds?: string[];
}

// Individual enrollment for equilibradas/random modes
export interface IndividualEnrollment {
  id: string;
  tournamentId: string;
  userId: string;
  displayName: string;
  elo: number;
  preferredPosition?: Position;
  playerType?: PlayerType;
}

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  maxPairs?: number;
}

export interface TournamentPair {
  id: string;
  tournamentId: string;
  categoryId?: string;
  goalkeeper: PairMember;
  forward: PairMember;
  seed?: number;
  status: 'inscrita' | 'confirmada' | 'eliminada' | 'ganadora';
  goalkeeperConfirmed?: PairConfirmationStatus;
  forwardConfirmed?: PairConfirmationStatus;
  checkInStatus?: CheckInStatus;
}

export interface PairMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  elo: number;
  playerType?: PlayerType;
}

// ===== MATCHES =====

export interface Match {
  id: string;
  tournamentId: string;
  categoryId?: string;
  round: number;
  position: number;
  pair1Id?: string;
  pair2Id?: string;
  score1?: number;
  score2?: number;
  winnerId?: string;
  status: MatchStatus;
  isBye: boolean;
  tableBrand: TableBrand;
  playStyle: PlayStyle;
  venueId: string;
  confirmedBy: string[];
  createdAt: string;
  games?: { score1: number; score2: number; winnerId: string }[];
  corrected?: boolean;
  correctedBy?: string;
}

// ===== ELO / RATINGS =====

export interface PlayerRating {
  userId: string;
  general: number;
  asGoalkeeper: number;
  asForward: number;
  byTable: Partial<Record<TableBrand, number>>;
  byStyle: Record<PlayStyle, number>;
  wins: number;
  losses: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  mvpCount: number;
  currentStreak: number;
  bestStreak: number;
}

export interface RatingChange {
  id: string;
  userId: string;
  matchId: string;
  tournamentId: string;
  venueId: string;
  tableBrand: TableBrand;
  playStyle: PlayStyle;
  position: Position;
  previousElo: number;
  newElo: number;
  change: number;
  date: string;
}

// ===== TEAMS =====

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  city: string;
  postalCode?: string;
  venueId?: string;
  description?: string;
  captainId: string;
  elo: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  displayName: string;
  role: TeamRole;
  joinedAt: string;
  status?: 'pendiente' | 'aceptada' | 'rechazada';
}

export interface TeamStats {
  teamId: string;
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

// ===== NOTIFICATIONS =====

export interface AppNotification {
  id: string;
  userId: string;
  type: 'tournament_invite' | 'team_invite' | 'match_result' | 'verification' | 'general' | 'pair_confirmation';
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

// ===== ROUND ROBIN =====

export interface RoundRobinMatch {
  id: string;
  pair1Id: string;
  pair2Id: string;
  winnerId?: string;
  played: boolean;
}

export interface RoundRobinStanding {
  pairId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
}

// ===== PAIR HISTORY =====

export interface PairHistoryRecord {
  goalkeeperId: string;
  goalkeeperName: string;
  forwardId: string;
  forwardName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  tournamentsWon: number;
  bestTable?: TableBrand;
  bestStyle?: PlayStyle;
}

// ===== SEASONS =====

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ===== ACHIEVEMENTS =====

export type AchievementId =
  | 'first_tournament_win'
  | 'five_tournament_wins'
  | 'ten_tournament_wins'
  | 'ten_win_streak'
  | 'mvp_tournament'
  | 'play_3_venues'
  | 'play_5_tables';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
}

export interface PlayerAchievement {
  achievementId: AchievementId;
  unlockedAt: string;
}

// ===== VENUE LEAGUES =====

export interface VenueLeague {
  id: string;
  venueId: string;
  name: string;
  seasonId?: string;
  tournamentIds: string[];
  createdAt: string;
}

// ===== RESULT CORRECTION =====

export interface ResultCorrection {
  id: string;
  tournamentId: string;
  matchKey: string;
  correctedBy: string;
  previousWinnerId: string;
  newWinnerId: string;
  reason?: string;
  date: string;
}

// ===== TEAM MATCHES (ENFRENTAMIENTOS) =====

export type TeamMatchStatus = 'pendiente' | 'en_curso' | 'finalizado';

export interface TeamMatchPairing {
  id: string;
  teamMatchId: string;
  pair1GoalkeeperName: string;
  pair1ForwardName: string;
  pair2GoalkeeperName: string;
  pair2ForwardName: string;
  score1?: number;
  score2?: number;
  winnerId?: string; // 'team1' | 'team2'
}

export interface TeamMatch {
  id: string;
  team1Id: string;
  team2Id: string;
  leagueId?: string;
  matchday?: number;
  pairings: TeamMatchPairing[];
  winnerId?: string;
  status: TeamMatchStatus;
  date: string;
}

// ===== TEAM LEAGUES =====

export type TeamLeagueStatus = 'activa' | 'finalizada';

export interface TeamLeague {
  id: string;
  name: string;
  season?: string;
  teamIds: string[];
  pairingsPerMatch: number;
  status: TeamLeagueStatus;
  createdAt: string;
}

export interface TeamLeagueStanding {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  pairingDiff: number;
}
