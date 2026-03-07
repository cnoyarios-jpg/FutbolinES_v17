import { Venue, VenueTable, Tournament, PlayerRating, User, Team, TournamentPair, Position } from '@/types';

export const MOCK_USER: User = {
  id: 'u1',
  email: 'carlos@ejemplo.com',
  displayName: 'Carlos García',
  city: 'Madrid',
  preferredPosition: 'portero',
  preferredStyle: 'parado',
  createdAt: '2024-01-15',
};

export const MOCK_VENUES: Venue[] = [
  {
    id: 'v1', name: 'Bar El Rincón', address: 'C/ Gran Vía 42', city: 'Madrid',
    lat: 40.4200, lng: -3.7025, photos: [], status: 'activo',
    verificationLevel: 'verificado', confidenceScore: 92, lastVerified: '2026-02-20',
    createdBy: 'u1', createdAt: '2024-06-01',
  },
  {
    id: 'v2', name: 'Café Sport', address: 'Av. Diagonal 310', city: 'Barcelona',
    lat: 41.3925, lng: 2.1630, photos: [], status: 'activo',
    verificationLevel: 'verificado', confidenceScore: 85, lastVerified: '2026-01-10',
    createdBy: 'u2', createdAt: '2024-07-15',
  },
  {
    id: 'v3', name: 'La Taberna del Gol', address: 'C/ Sierpes 18', city: 'Sevilla',
    lat: 37.3886, lng: -5.9953, photos: [], status: 'activo',
    verificationLevel: 'no_verificado', confidenceScore: 60, lastVerified: '2025-08-01',
    createdBy: 'u3', createdAt: '2024-03-20',
  },
  {
    id: 'v4', name: 'Txoko Futbolín', address: 'C/ Ledesma 12', city: 'Bilbao',
    lat: 43.2630, lng: -2.9350, photos: [], status: 'activo',
    verificationLevel: 'verificado', confidenceScore: 95, lastVerified: '2026-03-01',
    createdBy: 'u1', createdAt: '2024-09-01',
  },
  {
    id: 'v5', name: 'Bar La Esquina', address: 'C/ Colón 22', city: 'Valencia',
    lat: 39.4702, lng: -0.3768, photos: [], status: 'pendiente',
    verificationLevel: 'en_disputa', confidenceScore: 40, lastVerified: '2025-06-15',
    createdBy: 'u2', createdAt: '2024-11-01',
  },
  {
    id: 'v6', name: 'Cervecería Gol Norte', address: 'C/ Princesa 8', city: 'Madrid',
    lat: 40.4280, lng: -3.7140, photos: [], status: 'activo',
    verificationLevel: 'verificado', confidenceScore: 88, lastVerified: '2026-02-28',
    createdBy: 'u3', createdAt: '2025-01-10',
  },
];

export const MOCK_TABLES: VenueTable[] = [
  { id: 't1', venueId: 'v1', brand: 'Presas', quantity: 2, photos: [] },
  { id: 't2', venueId: 'v2', brand: 'Tsunami', quantity: 1, photos: [] },
  { id: 't3', venueId: 'v3', brand: 'Val', quantity: 1, photos: [] },
  { id: 't4', venueId: 'v4', brand: 'Presas', quantity: 3, photos: [] },
  { id: 't5', venueId: 'v5', brand: 'Garlando', quantity: 1, photos: [] },
  { id: 't6', venueId: 'v6', brand: 'Infinity', quantity: 2, photos: [] },
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
    status: 'abierto', hasCategories: false,
    categories: [],
    createdAt: '2026-03-05',
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
];

export const MOCK_PAIRS: TournamentPair[] = [
  {
    id: 'p1', tournamentId: 'to1',
    goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 },
    forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 },
    seed: 1, status: 'confirmada',
  },
  {
    id: 'p2', tournamentId: 'to1',
    goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 },
    forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 },
    seed: 2, status: 'confirmada',
  },
  {
    id: 'p3', tournamentId: 'to1',
    goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 },
    forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 },
    seed: 3, status: 'inscrita',
  },
  {
    id: 'p4', tournamentId: 'to1',
    goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 },
    forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 },
    seed: 4, status: 'inscrita',
  },
  {
    id: 'p5', tournamentId: 'to1',
    goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 },
    forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 },
    seed: 5, status: 'inscrita',
  },
  {
    id: 'p6', tournamentId: 'to1',
    goalkeeper: { userId: 'u2', displayName: 'Laura Martínez', elo: 1780 },
    forward: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1680 },
    seed: 6, status: 'inscrita',
  },
  // Rey de la pista pairs
  {
    id: 'pk1', tournamentId: 'to4',
    goalkeeper: { userId: 'u1', displayName: 'Carlos García', elo: 1900 },
    forward: { userId: 'u4', displayName: 'Ana López', elo: 1800 },
    seed: 1, status: 'confirmada',
  },
  {
    id: 'pk2', tournamentId: 'to4',
    goalkeeper: { userId: 'u3', displayName: 'Mikel Etxebarria', elo: 1830 },
    forward: { userId: 'u2', displayName: 'Laura Martínez', elo: 1860 },
    seed: 2, status: 'confirmada',
  },
  {
    id: 'pk3', tournamentId: 'to4',
    goalkeeper: { userId: 'u5', displayName: 'Pedro Sánchez', elo: 1740 },
    forward: { userId: 'u6', displayName: 'María Fernández', elo: 1750 },
    seed: 3, status: 'inscrita',
  },
  {
    id: 'pk4', tournamentId: 'to4',
    goalkeeper: { userId: 'u7', displayName: 'Javi Ruiz', elo: 1720 },
    forward: { userId: 'u8', displayName: 'Elena Torres', elo: 1700 },
    seed: 4, status: 'inscrita',
  },
];

export const MOCK_RANKINGS: (PlayerRating & { displayName: string; city: string; avatarUrl?: string })[] = [
  { userId: 'u1', displayName: 'Carlos García', city: 'Madrid', general: 1850, asGoalkeeper: 1900, asForward: 1750, byTable: { Presas: 1880, Tsunami: 1700 }, byStyle: { parado: 1870, movimiento: 1780 }, wins: 142, losses: 58, tournamentsPlayed: 34, tournamentsWon: 8 },
  { userId: 'u2', displayName: 'Laura Martínez', city: 'Barcelona', general: 1820, asGoalkeeper: 1780, asForward: 1860, byTable: { Tsunami: 1850, Presas: 1750 }, byStyle: { parado: 1790, movimiento: 1850 }, wins: 128, losses: 52, tournamentsPlayed: 30, tournamentsWon: 7 },
  { userId: 'u3', displayName: 'Mikel Etxebarria', city: 'Bilbao', general: 1790, asGoalkeeper: 1830, asForward: 1720, byTable: { Presas: 1820 }, byStyle: { parado: 1810, movimiento: 1740 }, wins: 115, losses: 65, tournamentsPlayed: 28, tournamentsWon: 5 },
  { userId: 'u4', displayName: 'Ana López', city: 'Sevilla', general: 1750, asGoalkeeper: 1700, asForward: 1800, byTable: { Val: 1780 }, byStyle: { parado: 1720, movimiento: 1780 }, wins: 98, losses: 62, tournamentsPlayed: 25, tournamentsWon: 4 },
  { userId: 'u5', displayName: 'Pedro Sánchez', city: 'Valencia', general: 1720, asGoalkeeper: 1740, asForward: 1680, byTable: { Garlando: 1750 }, byStyle: { parado: 1730, movimiento: 1700 }, wins: 89, losses: 71, tournamentsPlayed: 22, tournamentsWon: 3 },
  { userId: 'u6', displayName: 'María Fernández', city: 'Madrid', general: 1700, asGoalkeeper: 1650, asForward: 1750, byTable: { Presas: 1710, Infinity: 1690 }, byStyle: { parado: 1680, movimiento: 1720 }, wins: 82, losses: 68, tournamentsPlayed: 20, tournamentsWon: 2 },
  { userId: 'u7', displayName: 'Javi Ruiz', city: 'Bilbao', general: 1680, asGoalkeeper: 1720, asForward: 1620, byTable: { Presas: 1700 }, byStyle: { parado: 1700, movimiento: 1650 }, wins: 76, losses: 74, tournamentsPlayed: 18, tournamentsWon: 2 },
  { userId: 'u8', displayName: 'Elena Torres', city: 'Barcelona', general: 1650, asGoalkeeper: 1600, asForward: 1700, byTable: { Tsunami: 1680 }, byStyle: { parado: 1630, movimiento: 1670 }, wins: 70, losses: 60, tournamentsPlayed: 16, tournamentsWon: 1 },
];

export const MOCK_TEAMS: Team[] = [
  { id: 'team1', name: 'Madrid Futbolín Club', city: 'Madrid', captainId: 'u1', elo: 1820, description: 'El equipo de referencia en Madrid', createdAt: '2025-01-01' },
  { id: 'team2', name: 'BCN Foosballers', city: 'Barcelona', captainId: 'u2', elo: 1790, description: 'Pasión por el futbolín en Barcelona', createdAt: '2025-02-15' },
  { id: 'team3', name: 'Euskal Kicker', city: 'Bilbao', captainId: 'u3', elo: 1760, description: 'Fuerza vasca en la mesa', createdAt: '2025-03-01' },
];

export function getTableForVenue(venueId: string): VenueTable | undefined {
  return MOCK_TABLES.find(t => t.venueId === venueId);
}

export const TABLE_BRAND_COLORS: Record<string, string> = {
  Presas: '#2563eb',
  Tsunami: '#0891b2',
  Infinity: '#7c3aed',
  Val: '#059669',
  Garlando: '#dc2626',
  Leonhart: '#ca8a04',
  Tornado: '#ea580c',
  Otro: '#6b7280',
};

export const TABLE_BRAND_SHORT: Record<string, string> = {
  Presas: 'PRE',
  Tsunami: 'TSU',
  Infinity: 'INF',
  Val: 'VAL',
  Garlando: 'GAR',
  Leonhart: 'LEO',
  Tornado: 'TOR',
  Otro: '?',
};

/** Search players in the ranking by name (case-insensitive, partial match) */
export function searchPlayers(query: string) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return MOCK_RANKINGS.filter(r =>
    r.displayName.toLowerCase().includes(q)
  );
}

/**
 * Find or create a player. Returns userId, displayName, and ELO for the given position.
 * If position is specified, returns position-specific ELO (asGoalkeeper or asForward).
 * Otherwise returns general ELO.
 */
export function findOrCreatePlayer(
  displayName: string,
  city: string = '',
  position?: Position
): { userId: string; displayName: string; elo: number } {
  const existing = MOCK_RANKINGS.find(
    r => r.displayName.toLowerCase() === displayName.toLowerCase()
  );
  if (existing) {
    let elo = existing.general;
    if (position === 'portero') elo = existing.asGoalkeeper;
    else if (position === 'delantero') elo = existing.asForward;
    return { userId: existing.userId, displayName: existing.displayName, elo };
  }
  // Create new player with base ELO
  const BASE_ELO = 1500;
  const newUserId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  MOCK_RANKINGS.push({
    userId: newUserId,
    displayName,
    city,
    general: BASE_ELO,
    asGoalkeeper: BASE_ELO,
    asForward: BASE_ELO,
    byTable: {},
    byStyle: { parado: BASE_ELO, movimiento: BASE_ELO },
    wins: 0,
    losses: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0,
  });
  return { userId: newUserId, displayName, elo: BASE_ELO };
}
