export interface DivisionInfo {
  name: string;
  sublevel: 'III' | 'II' | 'I';
  fullName: string;
  colorClass: string;
  bgClass: string;
  iconName: string;
  gradient: string;
  min: number;
  max: number;
}

export const DIVISION_DEFS = [
  { name: 'Amateur', min: 1500, max: 1699, colorClass: 'text-stone-400', bgClass: 'bg-stone-500/10', iconName: 'shield', gradient: 'from-stone-400/20 to-stone-400/5' },
  { name: 'Competidor', min: 1700, max: 1899, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', iconName: 'swords', gradient: 'from-blue-500/20 to-blue-500/5' },
  { name: 'Avanzado', min: 1900, max: 2099, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', iconName: 'shield-check', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { name: 'Experto', min: 2100, max: 2399, colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10', iconName: 'gem', gradient: 'from-violet-500/20 to-violet-500/5' },
  { name: 'Maestro', min: 2400, max: 2699, colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10', iconName: 'medal', gradient: 'from-rose-500/20 to-rose-500/5' },
  { name: 'Gran Maestro', min: 2700, max: 2999, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10', iconName: 'crown', gradient: 'from-amber-500/20 to-amber-500/5' },
  { name: 'Leyenda', min: 3000, max: 3499, colorClass: 'text-fuchsia-500', bgClass: 'bg-fuchsia-500/10', iconName: 'sparkles', gradient: 'from-fuchsia-500/20 to-fuchsia-500/5' },
  { name: 'Dios del Futbolín', min: 3500, max: 99999, colorClass: 'text-yellow-400', bgClass: 'bg-gradient-to-r from-amber-500/20 to-yellow-400/10', iconName: 'flame', gradient: 'from-amber-500/30 to-yellow-400/15' },
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
    iconName: def.iconName,
    gradient: def.gradient,
    min: def.min,
    max: def.max,
  };
}

export function getDivisionBadge(elo: number): string {
  const div = getDivision(elo);
  return div.fullName;
}

export function getAllDivisions(): { name: string; min: number; max: number; iconName: string; colorClass: string; bgClass: string }[] {
  return DIVISION_DEFS.map(d => ({
    name: d.name,
    min: d.min,
    max: d.max === 99999 ? 3500 : d.min,
    iconName: d.iconName,
    colorClass: d.colorClass,
    bgClass: d.bgClass,
  }));
}

/** Get subdivision ranges for a division */
export function getSubdivisionRanges(def: typeof DIVISION_DEFS[0]): { sublevel: string; min: number; max: number }[] {
  const effectiveMax = def.max === 99999 ? def.min + 599 : def.max;
  const range = effectiveMax - def.min + 1;
  const third = Math.floor(range / 3);
  return [
    { sublevel: 'III', min: def.min, max: def.min + third - 1 },
    { sublevel: 'II', min: def.min + third, max: def.min + third * 2 - 1 },
    { sublevel: 'I', min: def.min + third * 2, max: def.max === 99999 ? def.max : effectiveMax },
  ];
}
