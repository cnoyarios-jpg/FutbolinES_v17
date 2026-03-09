// ===== TIERED ACHIEVEMENT SYSTEM =====

export type AchievementCategory = 
  | 'actividad' 
  | 'victorias' 
  | 'mvp' 
  | 'posicion' 
  | 'mesas' 
  | 'bares' 
  | 'parejas' 
  | 'equipos' 
  | 'prestigio' 
  | 'comunidad';

export interface AchievementTier {
  level: number;
  threshold: number;
  unlockedAt?: string;
}

export interface TieredAchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  tiers: number[]; // e.g., [1, 5, 15, 50, 100]
}

export interface PlayerTieredAchievement {
  achievementId: string;
  currentValue: number;
  unlockedTiers: { level: number; unlockedAt: string }[];
}

// ===== CATEGORY LABELS =====
export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  actividad: 'Actividad',
  victorias: 'Victorias',
  mvp: 'MVP',
  posicion: 'Posición',
  mesas: 'Mesas',
  bares: 'Bares',
  parejas: 'Parejas',
  equipos: 'Equipos',
  prestigio: 'Prestigio',
  comunidad: 'Comunidad',
};

export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  actividad: '⚡',
  victorias: '🏆',
  mvp: '⭐',
  posicion: '🎯',
  mesas: '🎱',
  bares: '🍺',
  parejas: '🤝',
  equipos: '👥',
  prestigio: '👑',
  comunidad: '🌐',
};

// ===== ALL TIERED ACHIEVEMENTS =====
export const TIERED_ACHIEVEMENTS: TieredAchievementDefinition[] = [
  // ACTIVIDAD
  { id: 'matches_played', name: 'Partidos jugados', description: 'Juega partidos', category: 'actividad', icon: '⚽', tiers: [1, 5, 15, 50, 100, 250, 500] },
  { id: 'tournaments_played', name: 'Torneos jugados', description: 'Participa en torneos', category: 'actividad', icon: '📅', tiers: [1, 5, 15, 30, 50, 100] },
  { id: 'days_active', name: 'Días activo', description: 'Juega en días distintos', category: 'actividad', icon: '📆', tiers: [1, 7, 30, 100, 365] },
  
  // VICTORIAS
  { id: 'matches_won', name: 'Partidos ganados', description: 'Gana partidos', category: 'victorias', icon: '✅', tiers: [1, 5, 15, 50, 100, 250, 500] },
  { id: 'tournaments_won', name: 'Torneos ganados', description: 'Gana torneos', category: 'victorias', icon: '🏆', tiers: [1, 3, 10, 25, 50] },
  { id: 'win_streak', name: 'Racha de victorias', description: 'Racha consecutiva máxima', category: 'victorias', icon: '🔥', tiers: [3, 5, 10, 15, 25] },
  
  // MVP
  { id: 'mvp_count', name: 'MVP conseguidos', description: 'Ser jugador del torneo', category: 'mvp', icon: '🌟', tiers: [1, 3, 5, 10, 25] },
  { id: 'mvp_high_level', name: 'MVP élite', description: 'MVP en torneos de ELO > 1600', category: 'mvp', icon: '💎', tiers: [1, 3, 5, 10] },
  
  // POSICIÓN
  { id: 'wins_as_goalkeeper', name: 'Portero ganador', description: 'Victorias como portero', category: 'posicion', icon: '🧤', tiers: [1, 10, 25, 50, 100] },
  { id: 'wins_as_forward', name: 'Delantero ganador', description: 'Victorias como delantero', category: 'posicion', icon: '⚔️', tiers: [1, 10, 25, 50, 100] },
  { id: 'versatile_player', name: 'Versátil', description: 'Victorias en ambas posiciones', category: 'posicion', icon: '🔄', tiers: [5, 15, 30, 50] },
  
  // MESAS
  { id: 'table_specialist', name: 'Especialista', description: 'Victorias en un tipo de mesa', category: 'mesas', icon: '🎯', tiers: [5, 15, 30, 50, 100] },
  { id: 'table_variety', name: 'Conocedor', description: 'Juega en tipos de mesa distintos', category: 'mesas', icon: '🎱', tiers: [2, 3, 5, 7] },
  
  // BARES
  { id: 'venues_played', name: 'Explorador', description: 'Juega en bares distintos', category: 'bares', icon: '🗺️', tiers: [1, 3, 5, 10, 20] },
  { id: 'venue_top3', name: 'Top 3 del bar', description: 'Estar en top 3 de un bar', category: 'bares', icon: '🥉', tiers: [1, 3, 5, 10] },
  { id: 'venue_champion', name: 'Rey del bar', description: 'Ser #1 en un bar', category: 'bares', icon: '👑', tiers: [1, 3, 5] },
  
  // PAREJAS
  { id: 'pair_matches', name: 'Pareja fiel', description: 'Partidos con la misma pareja', category: 'parejas', icon: '🤝', tiers: [5, 15, 30, 50, 100] },
  { id: 'pair_tournaments_won', name: 'Pareja campeona', description: 'Torneos ganados con la misma pareja', category: 'parejas', icon: '🏅', tiers: [1, 3, 5, 10] },
  { id: 'pair_high_winrate', name: 'Química', description: 'Winrate > 70% con pareja frecuente', category: 'parejas', icon: '💪', tiers: [1, 3, 5] },
  
  // EQUIPOS
  { id: 'team_member', name: 'En equipo', description: 'Pertenecer a un equipo', category: 'equipos', icon: '👥', tiers: [1] },
  { id: 'team_creator', name: 'Fundador', description: 'Crear un equipo', category: 'equipos', icon: '🏗️', tiers: [1] },
  { id: 'team_wins', name: 'Victorias en equipo', description: 'Ganar con tu equipo', category: 'equipos', icon: '🎖️', tiers: [1, 5, 15, 30] },
  
  // PRESTIGIO
  { id: 'elo_milestones', name: 'Escalador', description: 'Alcanzar ELO objetivo', category: 'prestigio', icon: '📈', tiers: [1550, 1600, 1700, 1800, 2000] },
  { id: 'giant_slayer', name: 'Caza gigantes', description: 'Ganar a rivales +100 ELO', category: 'prestigio', icon: '🐉', tiers: [1, 5, 10, 25] },
  { id: 'high_level_wins', name: 'Torneo élite', description: 'Ganar torneos con ELO medio alto', category: 'prestigio', icon: '💠', tiers: [1, 3, 5, 10] },
  
  // COMUNIDAD
  { id: 'venues_verified', name: 'Verificador', description: 'Verificar bares', category: 'comunidad', icon: '✓', tiers: [1, 5, 10, 25] },
  { id: 'venues_added', name: 'Descubridor', description: 'Añadir bares nuevos', category: 'comunidad', icon: '📍', tiers: [1, 3, 5, 10] },
  { id: 'tournaments_organized', name: 'Organizador', description: 'Organizar torneos', category: 'comunidad', icon: '📋', tiers: [1, 5, 10, 25, 50] },
];

// ===== HELPER FUNCTIONS =====

export function calculateLevel(value: number, tiers: number[]): number {
  let level = 0;
  for (const threshold of tiers) {
    if (value >= threshold) level++;
    else break;
  }
  return level;
}

export function getNextThreshold(value: number, tiers: number[]): number | null {
  for (const threshold of tiers) {
    if (value < threshold) return threshold;
  }
  return null; // All tiers complete
}

export function getProgressPercentage(value: number, tiers: number[]): number {
  const level = calculateLevel(value, tiers);
  if (level >= tiers.length) return 100;
  
  const currentThreshold = level > 0 ? tiers[level - 1] : 0;
  const nextThreshold = tiers[level];
  const progressInTier = value - currentThreshold;
  const tierRange = nextThreshold - currentThreshold;
  
  return Math.round((progressInTier / tierRange) * 100);
}

export function getTierName(level: number): string {
  const names = ['', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro', 'Leyenda'];
  return names[Math.min(level, names.length - 1)] || `Nivel ${level}`;
}

export function getTierColor(level: number): string {
  const colors = [
    'text-muted-foreground',
    'text-amber-700',
    'text-slate-400',
    'text-yellow-500',
    'text-cyan-400',
    'text-purple-500',
    'text-red-500',
    'text-pink-500',
  ];
  return colors[Math.min(level, colors.length - 1)];
}
