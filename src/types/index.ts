// ===== ENUMS =====

export type TableBrand = 'Presas' | 'Tsunami' | 'Infinity' | 'Val' | 'Garlando' | 'Leonhart' | 'Tornado' | 'Otro';
export type PlayStyle = 'parado' | 'movimiento';
export type Position = 'portero' | 'delantero';
export type VenueStatus = 'activo' | 'pendiente' | 'cambiado' | 'cerrado_temporal' | 'cerrado';
export type VerificationLevel = 'verificado' | 'no_verificado' | 'en_disputa';
export type TournamentFormat = 'eliminacion_simple' | 'eliminacion_doble' | 'round_robin' | 'grupos_cuadro' | 'suizo' | 'americano' | 'rey_mesa';
export type PairingMode = 'inscripcion' | 'equilibradas' | 'random';
export type TournamentStatus = 'borrador' | 'abierto' | 'en_curso' | 'finalizado' | 'cancelado';
export type MatchStatus = 'pendiente' | 'en_curso' | 'finalizado' | 'confirmado';
export type TeamRole = 'capitan' | 'jugador';

// ===== USERS =====

export interface User {
  id: string;
  email: string;
  displayName: string;
  city?: string;
  avatarUrl?: string;
  preferredPosition: Position;
  preferredStyle: PlayStyle;
  createdAt: string;
}

// ===== VENUES =====

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  photos: string[];
  description?: string;
  observations?: string;
  status: VenueStatus;
  verificationLevel: VerificationLevel;
  lastVerified?: string;
  confidenceScore: number;
  createdBy: string;
  createdAt: string;
}

export interface VenueTable {
  id: string;
  venueId: string;
  brand: TableBrand;
  quantity: number;
  condition?: string;
  photos: string[];
}

export interface Verification {
  id: string;
  venueId: string;
  userId: string;
  type: 'confirm' | 'report_change' | 'correction';
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
  hasWaitlist: boolean;
  entryFee?: number;
  prizes?: string;
  organizerId: string;
  organizerName: string;
  requiresApproval: boolean;
  status: TournamentStatus;
  hasCategories: boolean;
  categories: TournamentCategory[];
  createdAt: string;
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
}

export interface PairMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  elo: number;
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
}

// ===== NOTIFICATIONS =====

export interface AppNotification {
  id: string;
  userId: string;
  type: 'tournament_invite' | 'team_invite' | 'match_result' | 'verification' | 'general';
  title: string;
  body: string;
  read: boolean;
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
