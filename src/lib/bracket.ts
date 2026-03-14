import { TournamentPair, RoundRobinMatch, RoundRobinStanding } from '@/types';

export interface BracketMatch {
  round: number;
  position: number;
  pair1Id?: string;
  pair2Id?: string;
  winnerId?: string;
  isBye: boolean;
}

/**
 * Generates a single-elimination bracket with automatic byes for non-power-of-2 numbers.
 */
export function generateBracket(pairs: TournamentPair[]): BracketMatch[][] {
  const n = pairs.length;
  if (n < 2) return [];

  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);
  const seeded = [...pairs].sort((a, b) => {
    const eloA = a.goalkeeper.elo + a.forward.elo;
    const eloB = b.goalkeeper.elo + b.forward.elo;
    return eloB - eloA;
  });

  const slots: (string | null)[] = new Array(bracketSize).fill(null);
  const seedOrder = generateSeedOrder(bracketSize);
  for (let i = 0; i < seeded.length; i++) {
    slots[seedOrder[i]] = seeded[i].id;
  }

  const rounds: BracketMatch[][] = [];
  let currentSlots = slots;
  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: BracketMatch[] = [];
    const nextSlots: (string | null)[] = [];

    for (let i = 0; i < currentSlots.length; i += 2) {
      const pair1Id = currentSlots[i] || undefined;
      const pair2Id = currentSlots[i + 1] || undefined;
      const isBye = round === 0 && (!pair1Id || !pair2Id);
      const winnerId = isBye ? (pair1Id || pair2Id) : undefined;

      roundMatches.push({ round, position: i / 2, pair1Id, pair2Id, winnerId, isBye });
      nextSlots.push(winnerId || null);
    }

    rounds.push(roundMatches);
    currentSlots = nextSlots;
  }

  return rounds;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard bracket seeding: seed 1 vs seed N, seed 2 vs seed N-1, etc.
 * Returns seedOrder where seedOrder[seedIndex] = slotPosition.
 * Ensures top seeds get byes when the field isn't a power of 2.
 */
function generateSeedOrder(size: number): number[] {
  if (size <= 1) return [0];

  // Build bracket[slot] = seed (1-indexed) using standard interleaving
  const rounds = Math.log2(size);
  let bracket = [1, 2];
  for (let r = 1; r < rounds; r++) {
    const newBracket: number[] = [];
    const sum = Math.pow(2, r + 1) + 1;
    for (const seed of bracket) {
      newBracket.push(seed);
      newBracket.push(sum - seed);
    }
    bracket = newBracket;
  }

  // Invert: seedOrder[seed - 1] = slot
  const seedOrder = new Array(size);
  for (let slot = 0; slot < size; slot++) {
    seedOrder[bracket[slot] - 1] = slot;
  }
  return seedOrder;
}

/**
 * ELO calculation for a 2v2 match.
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  kFactor: number = 32,
  isTournament: boolean = true
): { winnerChange: number; loserChange: number } {
  const k = isTournament ? kFactor : kFactor * 0.5;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const change = Math.round(k * (1 - expectedWinner));
  return { winnerChange: change, loserChange: -change };
}

export function calculate2v2EloChanges(
  winnerGoalkeeperElo: number,
  winnerForwardElo: number,
  loserGoalkeeperElo: number,
  loserForwardElo: number,
  kFactor: number = 32,
  isTournament: boolean = true
) {
  const winnerAvg = (winnerGoalkeeperElo + winnerForwardElo) / 2;
  const loserAvg = (loserGoalkeeperElo + loserForwardElo) / 2;
  const { winnerChange, loserChange } = calculateEloChange(winnerAvg, loserAvg, kFactor, isTournament);
  return {
    winnerGoalkeeperChange: winnerChange,
    winnerForwardChange: winnerChange,
    loserGoalkeeperChange: loserChange,
    loserForwardChange: loserChange,
  };
}

// ===== ROUND ROBIN =====

export function generateRoundRobinMatches(pairs: TournamentPair[]): RoundRobinMatch[] {
  const matches: RoundRobinMatch[] = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      matches.push({
        id: `rr_${pairs[i].id}_${pairs[j].id}`,
        pair1Id: pairs[i].id,
        pair2Id: pairs[j].id,
        played: false,
      });
    }
  }
  return matches;
}

export function calculateRoundRobinStandings(
  pairs: TournamentPair[],
  matches: RoundRobinMatch[]
): RoundRobinStanding[] {
  const standings: Record<string, RoundRobinStanding> = {};

  for (const pair of pairs) {
    standings[pair.id] = { pairId: pair.id, played: 0, wins: 0, losses: 0, points: 0 };
  }

  for (const match of matches) {
    if (match.played && match.winnerId) {
      const loserId = match.winnerId === match.pair1Id ? match.pair2Id : match.pair1Id;
      if (standings[match.winnerId]) {
        standings[match.winnerId].played++;
        standings[match.winnerId].wins++;
        standings[match.winnerId].points += 3;
      }
      if (standings[loserId]) {
        standings[loserId].played++;
        standings[loserId].losses++;
      }
    }
  }

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });
}

// ===== EFFECTIVE RATING =====

/**
 * Calculates the effective rating for a match context.
 *
 * Formula: 0.6 * positionElo + 0.4 * generalElo + modeAdjust + tableAdjust
 *
 * - modeAdjust and tableAdjust are small contextual modifiers (NOT full ELO values).
 *   modeAdjust is clamped to ±180, tableAdjust to ±90.
 * - A new player with 1500/1500 and 0 adjustments → effective = 1500.
 * - The total contextual shift is capped at ±120 from the base to prevent inflation.
 */
export function calculateEffectiveRating(
  positionElo: number,
  generalElo: number,
  modeAdjust: number,
  tableAdjust: number
): number {
  const safeModeAdjust = Math.max(-180, Math.min(180, Number.isFinite(modeAdjust) ? modeAdjust : 0));
  const safeTableAdjust = Math.max(-90, Math.min(90, Number.isFinite(tableAdjust) ? tableAdjust : 0));

  // Weighted base from position and general ELO
  const baseRating = 0.6 * positionElo + 0.4 * generalElo;

  // Add individually-capped adjustments (mode ±180, table ±90)
  return Math.round(baseRating + safeModeAdjust + safeTableAdjust);
}
