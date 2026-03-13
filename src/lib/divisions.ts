export interface DivisionInfo {
  name: string;
  sublevel: 'III' | 'II' | 'I';
  fullName: string;
  colorClass: string;
  bgClass: string;
  emoji: string;
  gradient: string;
  min: number;
  max: number;
}

export const DIVISION_DEFS = [
  { name: 'Amateur', min: 1500, max: 1699, colorClass: 'text-muted-foreground', bgClass: 'bg-muted', emoji: '⚙️', gradient: 'from-muted to-muted' },
  { name: 'Competidor', min: 1700, max: 1899, colorClass: 'text-success', bgClass: 'bg-success/10', emoji: '⚔️', gradient: 'from-success/20 to-success/5' },
  { name: 'Avanzado', min: 1900, max: 2099, colorClass: 'text-primary', bgClass: 'bg-primary/10', emoji: '🛡️', gradient: 'from-primary/20 to-primary/5' },
  { name: 'Experto', min: 2100, max: 2399, colorClass: 'text-secondary', bgClass: 'bg-secondary/10', emoji: '💎', gradient: 'from-secondary/20 to-secondary/5' },
  { name: 'Maestro', min: 2400, max: 2699, colorClass: 'text-accent-foreground', bgClass: 'bg-accent/20', emoji: '👑', gradient: 'from-accent/30 to-accent/10' },
  { name: 'Gran Maestro', min: 2700, max: 2999, colorClass: 'text-destructive', bgClass: 'bg-destructive/10', emoji: '🔥', gradient: 'from-destructive/20 to-destructive/5' },
  { name: 'Leyenda', min: 3000, max: 3499, colorClass: 'text-warning-foreground', bgClass: 'bg-warning/20', emoji: '⚡', gradient: 'from-warning/30 to-warning/10' },
  { name: 'Dios del Futbolín', min: 3500, max: 99999, colorClass: 'text-accent', bgClass: 'bg-accent/30', emoji: '🌟', gradient: 'from-accent/40 to-accent/15' },
];

export function getDivision(elo: number): DivisionInfo {
  if (elo < 1500) elo = 1500;
  const def = DIVISION_DEFS.find(d => elo >= d.min && elo <= d.max) || DIVISION_DEFS[0];
  const range = def.max - def.min + 1;
  const third = range / 3;
  const offset = elo - def.min;
  let sublevel: 'III' | 'II' | 'I';
  if (offset < third) sublevel = 'III';
  else if (offset < third * 2) sublevel = 'II';
  else sublevel = 'I';
  return {
    name: def.name,
    sublevel,
    fullName: `${def.name} ${sublevel}`,
    colorClass: def.colorClass,
    bgClass: def.bgClass,
    emoji: def.emoji,
    gradient: def.gradient,
    min: def.min,
    max: def.max,
  };
}

export function getDivisionBadge(elo: number): string {
  const div = getDivision(elo);
  return `${div.emoji} ${div.fullName}`;
}

export function getAllDivisions(): { name: string; min: number; max: number; emoji: string; colorClass: string; bgClass: string }[] {
  return DIVISION_DEFS.map(d => ({
    name: d.name,
    min: d.min,
    max: d.max === 99999 ? 3500 : d.min,
    emoji: d.emoji,
    colorClass: d.colorClass,
    bgClass: d.bgClass,
  }));
}
