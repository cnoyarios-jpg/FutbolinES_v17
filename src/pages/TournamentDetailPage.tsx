import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_TOURNAMENTS, MOCK_PAIRS, MOCK_RANKINGS, MOCK_TEAMS, searchPlayers, findOrCreatePlayer, createGuestPlayer, getGuestPlayers, isGuestPlayer, findOrCreateRegisteredPlayer, getCurrentUser, openCheckIn, closeCheckIn, pairCheckIn, markPairAbsent, removeAbsentPairs, saveCorrection, getCorrections, recordPairHistory, checkStreakAchievement, checkVenueTableAchievements, finalizeTournament, setTournamentMvp, persistRankings, persistPairs, persistTournaments, calculateTournamentAvgElo, getIndividualEnrollments, addIndividualEnrollment, removeIndividualEnrollment, generateBalancedPairs, generateRandomPairs, confirmGeneratedPairs, getTeamMembers, getTeamStats, updateTeamStats, getStoredTeams, fixTeamMemberConsistency, recordEloHistory, addActivityEntry, createTeamMatch, getTeamMatchesForTeam, getTeamMatches, recordContextStats } from '@/data/mock';
import { getDivision } from '@/lib/divisions';
import { DivisionIcon } from '@/components/DivisionBadge';
import { ArrowLeft, Calendar, MapPin, Users, Shield, Target, Trophy, Check, Plus, X, Search, Crown, Clock, ChevronRight, UserCheck, UserPlus, ClipboardCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import { generateBracket, type BracketMatch, calculateEloChange, generateRoundRobinMatches, calculateRoundRobinStandings } from '@/lib/bracket';
import { TournamentPair, RoundRobinMatch, IndividualEnrollment } from '@/types';
import { toast } from 'sonner';

const formatLabels: Record<string, string> = {
  eliminacion_simple: 'Eliminación simple',
  eliminacion_doble: 'Eliminación doble',
  round_robin: 'Round Robin',
  grupos_cuadro: 'Grupos + Cuadro',
  suizo: 'Sistema suizo',
  americano: 'Americano',
  rey_mesa: 'Rey de la mesa',
};

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  abierto: 'Inscripción abierta',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  abierto: 'bg-success text-success-foreground',
  en_curso: 'bg-secondary text-secondary-foreground',
  finalizado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
};

interface EloChangeDisplay {
  matchKey: string;
  hasGuests: boolean;
  changes: {
    userId: string;
    displayName: string;
    position: 'portero' | 'delantero';
    previousElo: number;
    newElo: number;
    change: number;
    previousGeneral: number;
    newGeneral: number;
    generalChange: number;
    rawChange: number;
    multiplier: number;
    won: boolean;
  }[];
}

// ===== REY DE LA MESA types =====
interface KingMatch {
  id: string;
  courtPairId: string;
  challengerPairId: string;
  winnerId?: string;
}

export default function TournamentDetailPage() {
  const { id } = useParams();
  const tournament = MOCK_TOURNAMENTS.find(t => t.id === id);
  const pairs = MOCK_PAIRS.filter(p => p.tournamentId === id);
  const isRoundRobin = tournament?.format === 'round_robin';
  const isKingMode = tournament?.format === 'rey_mesa';

  // Fix team member consistency on load
  useState(() => { fixTeamMemberConsistency(); });

  // Bracket state (elimination)
  const [bracket, setBracket] = useState<BracketMatch[][]>(() =>
    !isRoundRobin && !isKingMode && pairs.length > 0 ? generateBracket(pairs) : []
  );

  // Round Robin state
  const [rrMatches, setRrMatches] = useState<RoundRobinMatch[]>(() =>
    isRoundRobin && pairs.length >= 2 ? generateRoundRobinMatches(pairs) : []
  );

  // === REY DE LA MESA STATE ===
  const [kingCourtPairId, setKingCourtPairId] = useState<string | null>(() => {
    if (isKingMode && pairs.length >= 2) return pairs[0].id;
    return null;
  });
  const [kingQueue, setKingQueue] = useState<string[]>(() => {
    if (isKingMode && pairs.length >= 2) return pairs.slice(2).map(p => p.id);
    return [];
  });
  const [kingCurrentChallenger, setKingCurrentChallenger] = useState<string | null>(() => {
    if (isKingMode && pairs.length >= 2) return pairs[1].id;
    return null;
  });
  const [kingHistory, setKingHistory] = useState<KingMatch[]>([]);
  const [kingWinStreak, setKingWinStreak] = useState(0);
  const [kingRoundsCompleted, setKingRoundsCompleted] = useState(0);

  const [eloChanges, setEloChanges] = useState<EloChangeDisplay[]>([]);
  const [, forceUpdate] = useState(0);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [selectedMvpId, setSelectedMvpId] = useState('');

  // === ENROLLMENT ===
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [goalkeeperSearch, setGoalkeeperSearch] = useState('');
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedGoalkeeper, setSelectedGoalkeeper] = useState<{ userId: string; displayName: string; elo: number; playerType?: string } | null>(null);
  const [selectedForward, setSelectedForward] = useState<{ userId: string; displayName: string; elo: number; playerType?: string } | null>(null);
  // Player type toggles for each slot
  const [gkPlayerType, setGkPlayerType] = useState<'registrado' | 'invitado'>('registrado');
  const [fwPlayerType, setFwPlayerType] = useState<'registrado' | 'invitado'>('registrado');
  // Guest postal codes
  const [gkPostalCode, setGkPostalCode] = useState('');
  const [fwPostalCode, setFwPostalCode] = useState('');

  // === INDIVIDUAL ENROLLMENT (equilibradas / random) ===
  const isIndividualMode = tournament?.pairingMode === 'equilibradas' || tournament?.pairingMode === 'random';
  const isTeamTournament = tournament?.isTeamTournament || false;
  const [showIndividualEnroll, setShowIndividualEnroll] = useState(false);
  const [individualSearch, setIndividualSearch] = useState('');
  const [selectedIndividual, setSelectedIndividual] = useState<{ userId: string; displayName: string; elo: number; preferredPosition?: string; playerType?: string } | null>(null);
  const [individualPlayerType, setIndividualPlayerType] = useState<'registrado' | 'invitado'>('registrado');
  const [individualGuestPostalCode, setIndividualGuestPostalCode] = useState('');
  const [individualGuestPosition, setIndividualGuestPosition] = useState<'portero' | 'delantero' | ''>('');
  const individualEnrollments = tournament ? getIndividualEnrollments(tournament.id) : [];
  const [generatedPairs, setGeneratedPairs] = useState<TournamentPair[] | null>(null);

  // === TEAM ENROLLMENT ===
  const [showTeamEnroll, setShowTeamEnroll] = useState(false);
  const allTeams = [...MOCK_TEAMS, ...getStoredTeams().filter(t => !MOCK_TEAMS.some(m => m.id === t.id))];

  const individualSearchResults = useMemo(() => {
    if (!individualSearch || individualSearch.trim().length < 2) return [];
    return searchPlayers(individualSearch);
  }, [individualSearch]);
  const goalkeeperResults = useMemo(() => {
    if (gkPlayerType === 'invitado') return [];
    return searchPlayers(goalkeeperSearch);
  }, [goalkeeperSearch, gkPlayerType]);

  const forwardResults = useMemo(() => {
    if (fwPlayerType === 'invitado') return [];
    return searchPlayers(forwardSearch);
  }, [forwardSearch, fwPlayerType]);

  const resetEnrollDialog = () => {
    setShowEnrollDialog(false);
    setGoalkeeperSearch(''); setForwardSearch('');
    setSelectedGoalkeeper(null); setSelectedForward(null);
    setGkPlayerType('registrado'); setFwPlayerType('registrado');
    setGkPostalCode(''); setFwPostalCode('');
  };
  const handleIndividualEnroll = () => {
    if (!tournament) return;
    
    // Guest enrollment
    if (individualPlayerType === 'invitado') {
      const guestName = individualSearch.trim();
      if (!guestName || guestName.length < 2) { toast.error('Nombre del invitado obligatorio (mín. 2 caracteres)'); return; }
      const existing = individualEnrollments.find(e => e.displayName.toLowerCase() === guestName.toLowerCase());
      if (existing) { toast.error('Este jugador ya está inscrito'); return; }
      if (individualEnrollments.length >= tournament.maxPairs * 2) { toast.error('Límite de jugadores alcanzado'); return; }
      
      const guest = createGuestPlayer(guestName, individualGuestPostalCode || undefined);
      addIndividualEnrollment({
        id: `ie_${Date.now()}`,
        tournamentId: tournament.id,
        userId: guest.id,
        displayName: guest.displayName,
        elo: 1500, // neutral ELO for guests
        preferredPosition: individualGuestPosition || undefined,
        playerType: 'invitado',
      });
      setIndividualSearch('');
      setIndividualGuestPostalCode('');
      setIndividualGuestPosition('');
      toast.success('Invitado inscrito');
      forceUpdate(n => n + 1);
      return;
    }
    
    // Registered player enrollment
    if (!selectedIndividual) return;
    const existingEnrollment = individualEnrollments.find(e => e.userId === selectedIndividual.userId);
    if (existingEnrollment) { toast.error('Este jugador ya está inscrito'); return; }
    if (individualEnrollments.length >= tournament.maxPairs * 2) { toast.error('Límite de jugadores alcanzado'); return; }

    const ranking = MOCK_RANKINGS.find(r => r.userId === selectedIndividual.userId);
    addIndividualEnrollment({
      id: `ie_${Date.now()}`,
      tournamentId: tournament.id,
      userId: selectedIndividual.userId,
      displayName: selectedIndividual.displayName,
      elo: ranking?.general || 1500,
      preferredPosition: ranking?.preferredPosition as any,
      playerType: (selectedIndividual.playerType as any) || 'registrado',
    });
    setSelectedIndividual(null);
    setIndividualSearch('');
    toast.success('Jugador inscrito');
    forceUpdate(n => n + 1);
  };

  const handleGeneratePairs = () => {
    if (!tournament) return;
    const enrollments = getIndividualEnrollments(tournament.id);
    if (enrollments.length < 2) { toast.error('Se necesitan al menos 2 jugadores'); return; }
    if (enrollments.length % 2 !== 0) { toast.error('El número de jugadores debe ser par'); return; }

    const pairs = tournament.pairingMode === 'equilibradas'
      ? generateBalancedPairs(tournament.id)
      : generateRandomPairs(tournament.id);

    if (pairs.length === 0) { toast.error('No se pudieron generar parejas'); return; }
    setGeneratedPairs(pairs);
  };

  const handleConfirmGeneratedPairs = () => {
    if (!generatedPairs || !tournament) return;
    confirmGeneratedPairs(tournament.id, generatedPairs);
    
    // Generate bracket/matches based on tournament format
    const confirmedPairs = MOCK_PAIRS.filter(p => p.tournamentId === tournament.id);
    if (confirmedPairs.length >= 2) {
      if (isRoundRobin) {
        setRrMatches(generateRoundRobinMatches(confirmedPairs));
      } else if (isKingMode) {
        setKingCourtPairId(confirmedPairs[0].id);
        setKingCurrentChallenger(confirmedPairs[1].id);
        setKingQueue(confirmedPairs.slice(2).map(p => p.id));
      } else {
        setBracket(generateBracket(confirmedPairs));
      }
    }
    
    setGeneratedPairs(null);
    toast.success('¡Parejas confirmadas! El torneo está listo para comenzar.');
    forceUpdate(n => n + 1);
  };

  const handleTeamEnroll = (teamId: string) => {
    if (!tournament) return;
    const t = MOCK_TOURNAMENTS.find(t => t.id === tournament.id);
    if (!t) return;
    if (!t.enrolledTeamIds) t.enrolledTeamIds = [];
    if (t.enrolledTeamIds.includes(teamId)) { toast.error('Este equipo ya está inscrito'); return; }
    t.enrolledTeamIds.push(teamId);
    persistTournaments();
    setShowTeamEnroll(false);
    toast.success('Equipo inscrito');
    forceUpdate(n => n + 1);
  };

  const handleEnrollPair = () => {
    let gkName = selectedGoalkeeper?.displayName || goalkeeperSearch.trim();
    let fwName = selectedForward?.displayName || forwardSearch.trim();

    if (!gkName || !fwName) {
      toast.error('Ambos jugadores son obligatorios');
      return;
    }
    if (!tournament) return;

    const currentPairs = MOCK_PAIRS.filter(p => p.tournamentId === id);
    if (currentPairs.length >= tournament.maxPairs) {
      toast.error('El torneo está lleno');
      return;
    }

    // Resolve goalkeeper
    let gk: { userId: string; displayName: string; elo: number; playerType?: string };
    if (selectedGoalkeeper) {
      gk = selectedGoalkeeper;
    } else if (gkPlayerType === 'invitado') {
      const guest = createGuestPlayer(gkName, gkPostalCode || undefined);
      gk = { userId: guest.id, displayName: guest.displayName, elo: 1500, playerType: 'invitado' };
    } else {
      const found = findOrCreatePlayer(gkName, tournament.city, 'portero');
      gk = found;
    }

    // Resolve forward
    let fw: { userId: string; displayName: string; elo: number; playerType?: string };
    if (selectedForward) {
      fw = selectedForward;
    } else if (fwPlayerType === 'invitado') {
      const guest = createGuestPlayer(fwName, fwPostalCode || undefined);
      fw = { userId: guest.id, displayName: guest.displayName, elo: 1500, playerType: 'invitado' };
    } else {
      const found = findOrCreatePlayer(fwName, tournament.city, 'delantero');
      fw = found;
    }

    const newPair: TournamentPair = {
      id: `p_${Date.now()}`,
      tournamentId: tournament.id,
      goalkeeper: {
        userId: gk.userId,
        displayName: gk.displayName,
        elo: gk.elo,
        playerType: (gk.playerType as any) || (gkPlayerType === 'invitado' ? 'invitado' : 'registrado'),
      },
      forward: {
        userId: fw.userId,
        displayName: fw.displayName,
        elo: fw.elo,
        playerType: (fw.playerType as any) || (fwPlayerType === 'invitado' ? 'invitado' : 'registrado'),
      },
      seed: currentPairs.length + 1,
      status: 'inscrita',
    };

    MOCK_PAIRS.push(newPair);

    // Regenerate matches
    const updatedPairs = MOCK_PAIRS.filter(p => p.tournamentId === id);
    if (isRoundRobin) {
      if (updatedPairs.length >= 2) {
        setRrMatches(generateRoundRobinMatches(updatedPairs));
      }
    } else if (isKingMode) {
      if (!kingCourtPairId && updatedPairs.length >= 1) {
        setKingCourtPairId(updatedPairs[0].id);
        if (updatedPairs.length >= 2) {
          setKingCurrentChallenger(updatedPairs[1].id);
          setKingQueue(updatedPairs.slice(2).map(p => p.id));
        }
      } else if (kingCourtPairId && !kingCurrentChallenger) {
        setKingCurrentChallenger(newPair.id);
      } else {
        setKingQueue(q => [...q, newPair.id]);
      }
    } else {
      if (updatedPairs.length >= 2) {
        setBracket(generateBracket(updatedPairs));
      }
    }

    resetEnrollDialog();
    persistPairs();
    toast.success('Pareja inscrita correctamente');
    forceUpdate(n => n + 1);
  };

  // === ELO UPDATE HELPER ===
  const applyEloChanges = useCallback((winnerId: string, loserId: string, matchKey: string) => {
    if (!tournament || tournament.status === 'finalizado' || tournament.status === 'cancelado') return;

    const allPairs = MOCK_PAIRS.filter(p => p.tournamentId === id);
    const winnerPair = allPairs.find(p => p.id === winnerId);
    const loserPair = allPairs.find(p => p.id === loserId);
    if (!winnerPair || !loserPair) return;

    const allPlayerIds = [
      winnerPair.goalkeeper.userId,
      winnerPair.forward.userId,
      loserPair.goalkeeper.userId,
      loserPair.forward.userId,
    ];
    const guestCount = allPlayerIds.filter(uid => isGuestPlayer(uid)).length;

    // Guest rules: all guests = 0%, mixed = 25%, all registered = 100%
    if (guestCount === 4) {
      toast.info('Todos invitados: sin impacto en ELO');
      return;
    }

    const eloMultiplier = guestCount > 0 ? 0.25 : 1;

    const getPlayerElo = (userId: string, fallbackElo: number, position: 'portero' | 'delantero') => {
      if (isGuestPlayer(userId)) return 1500;
      const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
      return ranking ? (position === 'portero' ? ranking.asGoalkeeper : ranking.asForward) : fallbackElo;
    };

    const winGkElo = getPlayerElo(winnerPair.goalkeeper.userId, winnerPair.goalkeeper.elo, 'portero');
    const winFwElo = getPlayerElo(winnerPair.forward.userId, winnerPair.forward.elo, 'delantero');
    const loseGkElo = getPlayerElo(loserPair.goalkeeper.userId, loserPair.goalkeeper.elo, 'portero');
    const loseFwElo = getPlayerElo(loserPair.forward.userId, loserPair.forward.elo, 'delantero');

    const winnerPairAvg = Math.round((winGkElo + winFwElo) / 2);
    const loserPairAvg = Math.round((loseGkElo + loseFwElo) / 2);
    const { winnerChange, loserChange } = calculateEloChange(winnerPairAvg, loserPairAvg);

    const changes: EloChangeDisplay['changes'] = [];

    const updateRanking = (
      userId: string,
      displayName: string,
      rawChange: number,
      position: 'portero' | 'delantero',
      won: boolean
    ) => {
      if (isGuestPlayer(userId)) return;

      const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
      if (!ranking) return;

      const scaledChange = Math.round(rawChange * eloMultiplier);
      if (scaledChange === 0) {
        changes.push({
          userId, displayName, position,
          previousElo: position === 'portero' ? ranking.asGoalkeeper : ranking.asForward,
          newElo: position === 'portero' ? ranking.asGoalkeeper : ranking.asForward,
          change: 0, previousGeneral: ranking.general, newGeneral: ranking.general,
          generalChange: 0,
          rawChange, multiplier: eloMultiplier, won,
        });
        return;
      }

      // Only update the position played
      const previousElo = position === 'portero' ? ranking.asGoalkeeper : ranking.asForward;
      const previousGeneral = ranking.general;

      if (position === 'portero') ranking.asGoalkeeper += scaledChange;
      else ranking.asForward += scaledChange;

      // General = average of both positions
      ranking.general = Math.round((ranking.asGoalkeeper + ranking.asForward) / 2);

      const newElo = position === 'portero' ? ranking.asGoalkeeper : ranking.asForward;
      const generalChange = ranking.general - previousGeneral;

      changes.push({
        userId, displayName, position,
        previousElo, newElo,
        change: newElo - previousElo,
        previousGeneral, newGeneral: ranking.general,
        generalChange,
        rawChange, multiplier: eloMultiplier, won,
      });

      // Record context stats
      recordContextStats(userId, tournament.playStyle, tournament.tableBrand, won);
    };

    updateRanking(winnerPair.goalkeeper.userId, winnerPair.goalkeeper.displayName, winnerChange, 'portero', true);
    updateRanking(winnerPair.forward.userId, winnerPair.forward.displayName, winnerChange, 'delantero', true);
    updateRanking(loserPair.goalkeeper.userId, loserPair.goalkeeper.displayName, loserChange, 'portero', false);
    updateRanking(loserPair.forward.userId, loserPair.forward.displayName, loserChange, 'delantero', false);

    const wGk = MOCK_RANKINGS.find(r => r.userId === winnerPair.goalkeeper.userId);
    const wFw = MOCK_RANKINGS.find(r => r.userId === winnerPair.forward.userId);
    const lGk = MOCK_RANKINGS.find(r => r.userId === loserPair.goalkeeper.userId);
    const lFw = MOCK_RANKINGS.find(r => r.userId === loserPair.forward.userId);
    if (wGk) { wGk.wins++; wGk.currentStreak = (wGk.currentStreak || 0) + 1; wGk.bestStreak = Math.max(wGk.bestStreak || 0, wGk.currentStreak); }
    if (wFw) { wFw.wins++; wFw.currentStreak = (wFw.currentStreak || 0) + 1; wFw.bestStreak = Math.max(wFw.bestStreak || 0, wFw.currentStreak); }
    if (lGk) { lGk.losses++; lGk.currentStreak = 0; }
    if (lFw) { lFw.losses++; lFw.currentStreak = 0; }

    [winnerPair.goalkeeper.userId, winnerPair.forward.userId].forEach(uid => {
      if (!isGuestPlayer(uid)) checkStreakAchievement(uid);
    });

    recordPairHistory(winnerPair.goalkeeper.userId, winnerPair.goalkeeper.displayName, winnerPair.forward.userId, winnerPair.forward.displayName, true);
    recordPairHistory(loserPair.goalkeeper.userId, loserPair.goalkeeper.displayName, loserPair.forward.userId, loserPair.forward.displayName, false);

    setEloChanges(prev => [...prev, { matchKey, hasGuests: guestCount > 0, changes }]);
    persistRankings();

    changes.forEach(c => {
      const ranking = MOCK_RANKINGS.find(r => r.userId === c.userId);
      if (ranking && !isGuestPlayer(c.userId)) {
        recordEloHistory(c.userId, c.position === 'portero' ? ranking.asGoalkeeper : ranking.asForward, undefined, c.position);
        recordEloHistory(c.userId, ranking.general, undefined, 'general');
        addActivityEntry({
          userId: c.userId,
          type: c.rawChange >= 0 ? 'match_win' : 'match_loss',
          description: `${c.rawChange >= 0 ? 'Victoria' : 'Derrota'} en ${tournament.name}`,
          eloChange: c.change,
          date: new Date().toISOString(),
        });
      }
    });

    if (guestCount > 0) {
      const allZero = changes.every(c => c.change === 0);
      toast.info(allZero ? 'Partido con invitados: cambio real 0 en ELO' : 'Partido con invitados: ELO reducido al 25%');
    } else {
      toast.success('Ganador registrado. ELO actualizado.');
    }
  }, [id, tournament]);

  // === REVERT ELO CHANGES (for corrections) ===
  const revertEloChanges = useCallback((previousWinnerId: string, previousLoserId: string, matchKey: string) => {
    if (!tournament) return;

    const entry = eloChanges.find(ec => ec.matchKey === matchKey);
    if (!entry) return;

    entry.changes.forEach(change => {
      if (isGuestPlayer(change.userId)) return;
      const ranking = MOCK_RANKINGS.find(r => r.userId === change.userId);
      if (!ranking) return;

      if (change.position === 'portero') ranking.asGoalkeeper -= change.change;
      else ranking.asForward -= change.change;
      // Recalculate general as average
      ranking.general = Math.round((ranking.asGoalkeeper + ranking.asForward) / 2);

      // Revert context stats
      recordContextStats(change.userId, tournament.playStyle, tournament.tableBrand, change.won, { revert: true });

      if (change.rawChange > 0) ranking.wins = Math.max(0, ranking.wins - 1);
      if (change.rawChange < 0) ranking.losses = Math.max(0, ranking.losses - 1);
    });

    setEloChanges(prev => prev.filter(ec => ec.matchKey !== matchKey));
    persistRankings();
  }, [eloChanges, tournament]);

  // === BRACKET: Select winner (elimination) ===
  const handleSelectWinner = useCallback((roundIdx: number, matchIdx: number, winnerId: string) => {
    if (tournament.status === 'finalizado' || tournament.status === 'cancelado') return;
    
    const currentUser = getCurrentUser();
    const isOrganizer = currentUser && tournament.organizerId === currentUser.id;
    
    setBracket(prev => {
      const newBracket = prev.map(r => r.map(m => ({ ...m })));
      const match = newBracket[roundIdx][matchIdx];
      const matchKey = `${roundIdx}-${matchIdx}`;
      
      // If match already has a winner and we're changing it (correction)
      if (match.winnerId && match.winnerId !== winnerId) {
        if (!isOrganizer) {
          toast.error('Solo el organizador puede corregir resultados');
          return prev;
        }
        
        const previousWinnerId = match.winnerId;
        const previousLoserId = match.pair1Id === previousWinnerId ? match.pair2Id : match.pair1Id;
        
        // Revert old ELO changes
        if (previousLoserId) {
          revertEloChanges(previousWinnerId, previousLoserId, matchKey);
        }
        
        // Save correction record
        saveCorrection({
          id: `corr_${Date.now()}`,
          tournamentId: tournament.id,
          matchKey,
          correctedBy: currentUser.id,
          previousWinnerId,
          newWinnerId: winnerId,
          date: new Date().toISOString(),
        });
        
        toast.success('Resultado corregido. ELO recalculado.');
      }
      
      // Set new winner
      match.winnerId = winnerId;
      const loserId = match.pair1Id === winnerId ? match.pair2Id : match.pair1Id;
      
      // Apply new ELO changes (only if not already applied for new result)
      if (loserId) {
        applyEloChanges(winnerId, loserId, matchKey);
      }

      // Update next round
      if (roundIdx + 1 < newBracket.length) {
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const nextMatch = newBracket[roundIdx + 1][nextMatchIdx];
        if (matchIdx % 2 === 0) {
          nextMatch.pair1Id = winnerId;
        } else {
          nextMatch.pair2Id = winnerId;
        }
      }

      return newBracket;
    });
    forceUpdate(n => n + 1);
  }, [applyEloChanges, revertEloChanges, tournament]);

  // === ROUND ROBIN: Select winner ===
  const handleRRSelectWinner = useCallback((matchId: string, winnerId: string) => {
    if (tournament.status === 'finalizado' || tournament.status === 'cancelado') return;
    setRrMatches(prev => {
      const updated = prev.map(m => {
        if (m.id === matchId && !m.played) {
          return { ...m, winnerId, played: true };
        }
        return m;
      });
      return updated;
    });

    const match = rrMatches.find(m => m.id === matchId);
    if (match) {
      const loserId = match.pair1Id === winnerId ? match.pair2Id : match.pair1Id;
      applyEloChanges(winnerId, loserId, matchId);
    }

    forceUpdate(n => n + 1);
  }, [rrMatches, applyEloChanges]);

  // === REY DE LA MESA: Select winner ===
  const handleKingSelectWinner = useCallback((winnerId: string) => {
    if (tournament.status === 'finalizado' || tournament.status === 'cancelado') return;
    if (!kingCourtPairId || !kingCurrentChallenger) return;

    const loserId = winnerId === kingCourtPairId ? kingCurrentChallenger : kingCourtPairId;
    const matchId = `king_${kingHistory.length}`;

    setKingHistory(prev => [...prev, {
      id: matchId,
      courtPairId: kingCourtPairId,
      challengerPairId: kingCurrentChallenger,
      winnerId,
    }]);

    applyEloChanges(winnerId, loserId, matchId);

    if (winnerId === kingCourtPairId) {
      setKingWinStreak(prev => prev + 1);
    } else {
      setKingCourtPairId(winnerId);
      setKingWinStreak(1);
    }

    if (kingQueue.length > 0) {
      setKingCurrentChallenger(kingQueue[0]);
      setKingQueue(q => q.slice(1));
    } else {
      // Round complete - check if more rounds are needed
      const maxRounds = tournament.kingRounds || 1;
      const newCompleted = kingRoundsCompleted + 1;
      setKingRoundsCompleted(newCompleted);

      if (newCompleted < maxRounds) {
        // Start new round: queue all pairs except current king
        const newKingId = winnerId;
        const allPairIds = pairs.map(p => p.id);
        const nextQueue = allPairIds.filter(pid => pid !== newKingId);
        if (nextQueue.length > 0) {
          setKingCurrentChallenger(nextQueue[0]);
          setKingQueue(nextQueue.slice(1));
        } else {
          setKingCurrentChallenger(null);
        }
        toast.info(`Vuelta ${newCompleted} completada. Comienza vuelta ${newCompleted + 1} de ${maxRounds}.`);
      } else {
        setKingCurrentChallenger(null);
      }
    }

    forceUpdate(n => n + 1);
  }, [kingCourtPairId, kingCurrentChallenger, kingQueue, kingHistory.length, applyEloChanges, kingRoundsCompleted, pairs, tournament]);

  if (!tournament) {
    return (
      <PageShell title="Torneo no encontrado">
        <p className="text-center text-muted-foreground mt-8">Este torneo no existe.</p>
        <Link to="/torneos" className="mt-4 block text-center text-sm text-primary font-medium">Volver a torneos</Link>
      </PageShell>
    );
  }

  const formattedDate = new Date(tournament.date).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const getPairName = (pairId: string) => {
    const pair = pairs.find(p => p.id === pairId) || MOCK_PAIRS.find(p => p.id === pairId);
    if (!pair) return '—';
    return `${pair.goalkeeper.displayName.split(' ')[0]} / ${pair.forward.displayName.split(' ')[0]}`;
  };

  const getPairFull = (pairId: string) => {
    return pairs.find(p => p.id === pairId) || MOCK_PAIRS.find(p => p.id === pairId);
  };

  const rrStandings = isRoundRobin ? calculateRoundRobinStandings(MOCK_PAIRS.filter(p => p.tournamentId === id), rrMatches) : [];
  const isTournamentLocked = tournament.status === 'finalizado' || tournament.status === 'cancelado';
  const kingFinished = isKingMode && !kingCurrentChallenger && kingHistory.length > 0;
  const currentUser = getCurrentUser();
  const isOrganizer = !!currentUser && tournament.organizerId === currentUser.id;
  const allTournamentPlayers = pairs.flatMap(p => [
    { userId: p.goalkeeper.userId, displayName: p.goalkeeper.displayName },
    { userId: p.forward.userId, displayName: p.forward.displayName },
  ]);
  const uniqueTournamentPlayers = allTournamentPlayers.filter((p, i, arr) => arr.findIndex(x => x.userId === p.userId) === i);

  let finalWinnerPairId: string | undefined;
  if (isKingMode && kingCourtPairId) {
    finalWinnerPairId = kingCourtPairId;
  } else if (isRoundRobin && rrStandings.length > 0) {
    finalWinnerPairId = rrStandings[0].pairId;
  } else if (bracket.length > 0) {
    const finalRound = bracket[bracket.length - 1];
    if (finalRound && finalRound[0]?.winnerId) finalWinnerPairId = finalRound[0].winnerId;
  }

  const canFinalizeTournament = isOrganizer && !isTournamentLocked && Boolean(finalWinnerPairId) && uniqueTournamentPlayers.length > 0;

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/torneos" className="rounded-lg bg-muted p-2">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold truncate">{tournament.name}</h1>
          <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusColors[tournament.status]}`}>
            {statusLabels[tournament.status]}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{tournament.tableBrand}</span>
        <span className="rounded-md bg-accent/30 px-2 py-0.5 text-xs font-semibold text-accent-foreground capitalize">{tournament.playStyle}</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{formatLabels[tournament.format]}</span>
      </div>

      {/* Info */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="capitalize">{formattedDate} · {tournament.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            {tournament.venueId ? (
              <Link to={`/locales/${tournament.venueId}`} className="text-primary font-medium hover:underline">
                {tournament.venueName}
              </Link>
            ) : (
              <span>{tournament.venueName}</span>
            )}
            <span>· {tournament.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>{pairs.length}/{tournament.maxPairs} parejas</span>
          </div>
          {/* ELO medio del torneo */}
          {(() => {
            const { avgElo, registeredCount } = calculateTournamentAvgElo(tournament.id);
            const div = registeredCount >= 2 ? getDivision(avgElo) : null;
            return (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-accent" />
                {registeredCount >= 2 ? (
                  <>
                    <span className="font-semibold text-accent-foreground">ELO medio: {avgElo}</span>
                    {div && <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${div.bgClass} ${div.colorClass}`}><DivisionIcon iconName={div.iconName} className="h-3 w-3" /> {div.fullName}</span>}
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">ELO medio: sin datos suficientes</span>
                )}
                <span className="text-xs text-muted-foreground">({registeredCount} registrados)</span>
              </div>
            );
          })()}
          {tournament.entryFee && <p>💰 Inscripción: {tournament.entryFee}€</p>}
          {tournament.prizes && <p>🏆 {tournament.prizes}</p>}
        </div>
        {tournament.description && (
          <p className="mt-3 text-sm text-foreground border-t border-border pt-3">{tournament.description}</p>
        )}
      </div>

      {/* Categorías */}
      {tournament.hasCategories && tournament.categories.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">Categorías</h3>
          <div className="flex flex-wrap gap-2">
            {tournament.categories.map(cat => (
              <div key={cat.id} className="rounded-lg bg-muted px-3 py-2 text-center">
                <p className="text-sm font-semibold">{cat.name}</p>
                {cat.maxPairs && <p className="text-[10px] text-muted-foreground">Máx {cat.maxPairs} parejas</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* CHECK-IN Section */}
      {(() => {
        const currentUser = getCurrentUser();
        const isOrganizer = currentUser && tournament.organizerId === currentUser.id;
        const checkInPairs = MOCK_PAIRS.filter(p => p.tournamentId === id);

        return (tournament.status === 'abierto' || tournament.status === 'en_curso') && (
          <div className="rounded-xl bg-card p-4 shadow-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" /> Check-in
              </h3>
              {isOrganizer && (
                <div className="flex gap-1.5">
                  {!tournament.checkInOpen ? (
                    <button onClick={() => { openCheckIn(tournament.id); forceUpdate(n => n + 1); toast.success('Check-in abierto'); }}
                      className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground">Abrir check-in</button>
                  ) : (
                    <>
                      <button onClick={() => { closeCheckIn(tournament.id); forceUpdate(n => n + 1); toast.success('Check-in cerrado'); }}
                        className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Cerrar</button>
                      <button onClick={() => { const count = removeAbsentPairs(tournament.id); forceUpdate(n => n + 1); toast.success(`${count} pareja(s) ausente(s) eliminada(s)`); }}
                        className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">Eliminar ausentes</button>
                    </>
                  )}
                </div>
              )}
            </div>
            {tournament.checkInOpen ? (
              <div className="flex flex-col gap-1.5">
                {checkInPairs.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs">
                    <span className="font-medium">{p.goalkeeper.displayName.split(' ')[0]} / {p.forward.displayName.split(' ')[0]}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                        p.checkInStatus === 'confirmado' ? 'bg-success/10 text-success' :
                        p.checkInStatus === 'ausente' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/20 text-warning-foreground'
                      }`}>{p.checkInStatus === 'confirmado' ? '✓ Confirmado' : p.checkInStatus === 'ausente' ? '✗ Ausente' : '⏳ Pendiente'}</span>
                      {isOrganizer && p.checkInStatus !== 'confirmado' && (
                        <>
                          <button onClick={() => { pairCheckIn(p.id); forceUpdate(n => n + 1); }} className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] text-success font-semibold">✓</button>
                          <button onClick={() => { markPairAbsent(p.id); forceUpdate(n => n + 1); }} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive font-semibold">✗</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">El check-in aún no está abierto.</p>
            )}
          </div>
        );
      })()}


      {/* === TEAM ENROLLMENT (for team tournaments) === */}
      {isTeamTournament && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold">Equipos inscritos ({tournament.enrolledTeamIds?.length || 0})</h3>
            {isOrganizer && (
              <button onClick={() => setShowTeamEnroll(true)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition active:scale-95">
                <Plus className="h-3 w-3" /> Inscribir equipo
              </button>
            )}
          </div>
          {(tournament.enrolledTeamIds || []).length > 0 ? (
            <div className="flex flex-col gap-2">
              {(tournament.enrolledTeamIds || []).map((teamId, i) => {
                const team = allTeams.find(t => t.id === teamId);
                const stats = team ? getTeamStats(team.id) : null;
                return (
                  <div key={teamId} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{team?.name || teamId}</p>
                      <p className="text-[10px] text-muted-foreground">{team?.city} · ELO {team?.elo} · {stats?.wins || 0}V/{stats?.losses || 0}D</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay equipos inscritos aún.</p>
          )}

          {/* Generate team matches button */}
          {isOrganizer && (tournament.enrolledTeamIds || []).length >= 2 && (
            <button
              onClick={() => {
                const teamIds = tournament.enrolledTeamIds || [];
                for (let i = 0; i < teamIds.length; i++) {
                  for (let j = i + 1; j < teamIds.length; j++) {
                    const existing = getTeamMatchesForTeam(teamIds[i]).filter(m =>
                      (m.team1Id === teamIds[j] || m.team2Id === teamIds[j])
                    );
                    if (existing.length === 0) {
                      createTeamMatch(teamIds[i], teamIds[j], 3);
                    }
                  }
                }
                const t = MOCK_TOURNAMENTS.find(t => t.id === tournament.id);
                if (t && t.status === 'abierto') { t.status = 'en_curso'; persistTournaments(); }
                toast.success('Enfrentamientos generados');
                forceUpdate(n => n + 1);
              }}
              className="mt-3 w-full rounded-xl bg-secondary py-3 text-center font-display font-semibold text-secondary-foreground transition active:scale-[0.98]"
            >
              ⚡ Generar enfrentamientos
            </button>
          )}
        </div>
      )}

      {/* === TEAM MATCHES RESULTS === */}
      {isTeamTournament && (() => {
        const enrolledSet = new Set(tournament.enrolledTeamIds || []);
        const tMatches = getTeamMatches().filter(m => enrolledSet.has(m.team1Id) && enrolledSet.has(m.team2Id));
        if (tMatches.length === 0) return null;
        const getTeamNameById = (tid: string) => allTeams.find(t => t.id === tid)?.name || tid;
        return (
          <div className="rounded-xl bg-card p-4 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold mb-3">⚔️ Partidos ({tMatches.filter(m => m.status === 'finalizado').length}/{tMatches.length})</h3>
            <div className="flex flex-col gap-2">
              {tMatches.map(match => {
                const isDone = match.status === 'finalizado';
                const canSelect = !isTournamentLocked && !isDone && isOrganizer;
                const handleTeamWin = (winTeamId: string) => {
                  if (!canSelect) return;
                  const all = getTeamMatches();
                  const m = all.find(x => x.id === match.id);
                  if (!m) return;
                  m.winnerId = winTeamId;
                  m.status = 'finalizado';
                  m.pairings.forEach((p, i) => {
                    const isT1 = winTeamId === m.team1Id;
                    p.score1 = i < 2 ? (isT1 ? 10 : 0) : (isT1 ? 0 : 10);
                    p.score2 = i < 2 ? (isT1 ? 0 : 10) : (isT1 ? 10 : 0);
                    p.winnerId = i < 2 ? (isT1 ? 'team1' : 'team2') : (isT1 ? 'team2' : 'team1');
                  });
                  localStorage.setItem('futbolines_team_matches', JSON.stringify(all));
                  const loserId = winTeamId === m.team1Id ? m.team2Id : m.team1Id;
                  const ws = getTeamStats(winTeamId);
                  updateTeamStats(winTeamId, { matchesPlayed: ws.matchesPlayed + 1, wins: ws.wins + 1 });
                  const ls = getTeamStats(loserId);
                  updateTeamStats(loserId, { matchesPlayed: ls.matchesPlayed + 1, losses: ls.losses + 1 });
                  toast.success('Resultado registrado');
                  forceUpdate(n => n + 1);
                };
                return (
                  <div key={match.id} className={`rounded-lg border p-3 text-xs ${isDone ? 'border-border bg-muted/30' : 'border-border bg-card'}`}>
                    <div
                      className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${match.winnerId === match.team1Id ? 'bg-success/10 font-semibold text-success' : ''} ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                      onClick={() => handleTeamWin(match.team1Id)}
                    >
                      <span>{getTeamNameById(match.team1Id)}</span>
                      {match.winnerId === match.team1Id && <Check className="h-3 w-3 text-success" />}
                      {canSelect && <span className="text-[9px] text-primary">Elegir</span>}
                    </div>
                    <div className="h-px bg-border my-0.5" />
                    <div
                      className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${match.winnerId === match.team2Id ? 'bg-success/10 font-semibold text-success' : ''} ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                      onClick={() => handleTeamWin(match.team2Id)}
                    >
                      <span>{getTeamNameById(match.team2Id)}</span>
                      {match.winnerId === match.team2Id && <Check className="h-3 w-3 text-success" />}
                      {canSelect && <span className="text-[9px] text-primary">Elegir</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* === INDIVIDUAL ENROLLMENT (equilibradas / random) === */}
      {isIndividualMode && !isTeamTournament && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold">Jugadores inscritos ({individualEnrollments.length})</h3>
            {(tournament.status === 'abierto' || tournament.status === 'en_curso') && (
              <button onClick={() => setShowIndividualEnroll(true)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition active:scale-95">
                <Plus className="h-3 w-3" /> Añadir jugador
              </button>
            )}
          </div>
          {individualEnrollments.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {individualEnrollments.map((e, i) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground w-5">{i + 1}</span>
                    <span className="font-medium">{e.displayName}</span>
                    <span className="text-muted-foreground">ELO {e.elo}</span>
                    {e.preferredPosition && <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary capitalize">{e.preferredPosition}</span>}
                    {e.playerType === 'invitado' && <span className="rounded bg-warning/20 px-1 py-0.5 text-[9px] font-semibold text-warning-foreground">👤 Inv.</span>}
                  </div>
                  {isOrganizer && (
                    <button onClick={() => { removeIndividualEnrollment(tournament.id, e.userId); forceUpdate(n => n + 1); }} className="text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay jugadores inscritos. Inscríbelos individualmente.</p>
          )}

          {/* Odd number warning */}
          {individualEnrollments.length > 0 && individualEnrollments.length % 2 !== 0 && (
            <div className="mt-3 rounded-lg bg-warning/10 border border-warning/30 p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0" />
              <p className="text-xs text-warning-foreground">Número impar de jugadores. Añade uno más para poder generar parejas.</p>
            </div>
          )}

          {/* Generate pairs button */}
          {isOrganizer && individualEnrollments.length >= 2 && individualEnrollments.length % 2 === 0 && pairs.length === 0 && (
            <button onClick={handleGeneratePairs} className="mt-3 w-full rounded-xl bg-secondary py-3 text-center font-display font-semibold text-secondary-foreground transition active:scale-[0.98]">
              ⚡ Generar parejas ({tournament.pairingMode === 'equilibradas' ? 'equilibradas' : 'aleatorias'})
            </button>
          )}
        </div>
      )}

      {/* === GENERATED PAIRS PREVIEW === */}
      {generatedPairs && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4 border-2 border-accent/30">
          <h3 className="font-display text-sm font-semibold mb-3">👀 Vista previa de parejas generadas</h3>
          <div className="flex flex-col gap-2">
            {generatedPairs.map((pair, i) => {
              const avgElo = Math.round((pair.goalkeeper.elo + pair.forward.elo) / 2);
              return (
                <div key={pair.id} className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-primary">Pareja {i + 1}</span>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">ELO medio: {avgElo}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-sm font-medium">{pair.goalkeeper.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{pair.goalkeeper.elo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Target className="h-3 w-3 text-secondary shrink-0" />
                    <span className="text-sm font-medium">{pair.forward.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{pair.forward.elo}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => { setGeneratedPairs(null); handleGeneratePairs(); }} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">
              🔄 Regenerar
            </button>
            <button onClick={handleConfirmGeneratedPairs} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
              ✅ Confirmar parejas
            </button>
          </div>
        </div>
      )}

      {/* === PAIRS LIST (standard mode or after generation) === */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold">Parejas inscritas ({pairs.length})</h3>
          {!isIndividualMode && !isTeamTournament && pairs.length < tournament.maxPairs && (
            <button
              onClick={() => setShowEnrollDialog(true)}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition active:scale-95"
            >
              <Plus className="h-3 w-3" /> Añadir
            </button>
          )}
        </div>
        {pairs.length > 0 ? (
          <div className="flex flex-col gap-2">
            {pairs.map((pair, i) => (
              <div key={pair.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{pair.goalkeeper.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{pair.goalkeeper.elo}</span>
                    <PlayerTypeBadge type={pair.goalkeeper.playerType} userId={pair.goalkeeper.userId} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Target className="h-3 w-3 text-secondary shrink-0" />
                    <span className="text-sm font-medium truncate">{pair.forward.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{pair.forward.elo}</span>
                    <PlayerTypeBadge type={pair.forward.playerType} userId={pair.forward.userId} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{pair.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isIndividualMode ? 'Las parejas se generarán automáticamente.' : 'No hay parejas inscritas aún. ¡Añade la primera!'}
          </p>
        )}
      </div>

      {/* === REY DE LA MESA VIEW === */}
      {isKingMode && pairs.length >= 2 && (
        <div className="space-y-4 mb-4">
          <div className="rounded-xl bg-card p-4 shadow-card border-2 border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-accent" />
              <h3 className="font-display text-sm font-bold">En pista</h3>
              {(tournament.kingRounds || 1) > 1 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Vuelta {kingRoundsCompleted + 1}/{tournament.kingRounds}
                </span>
              )}
              {kingWinStreak > 0 && (
                <span className="ml-auto rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  🔥 {kingWinStreak} victoria{kingWinStreak > 1 ? 's' : ''} consecutiva{kingWinStreak > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {kingCourtPairId && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <PairDisplay pair={getPairFull(kingCourtPairId)} label="👑 Rey de la pista" />
              </div>
            )}
          </div>

          {kingCurrentChallenger && kingCourtPairId && (
            <div className="rounded-xl bg-card p-4 shadow-card">
              <h3 className="font-display text-sm font-semibold mb-3">⚔️ Partido en curso</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleKingSelectWinner(kingCourtPairId)}
                  className="rounded-lg border border-border p-3 hover:bg-primary/5 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-accent uppercase">Rey</span>
                      <p className="text-sm font-semibold">{getPairName(kingCourtPairId)}</p>
                    </div>
                    <span className="text-[10px] text-primary font-medium">Elegir ganador</span>
                  </div>
                </button>
                <div className="text-center text-xs text-muted-foreground font-semibold">VS</div>
                <button
                  onClick={() => handleKingSelectWinner(kingCurrentChallenger)}
                  className="rounded-lg border border-border p-3 hover:bg-primary/5 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-secondary uppercase">Retador</span>
                      <p className="text-sm font-semibold">{getPairName(kingCurrentChallenger)}</p>
                    </div>
                    <span className="text-[10px] text-primary font-medium">Elegir ganador</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {kingQueue.length > 0 && (
            <div className="rounded-xl bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-semibold">Cola de espera ({kingQueue.length})</h3>
              </div>
              <div className="flex flex-col gap-1.5">
                {kingQueue.map((pairId, i) => (
                  <div key={pairId} className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted-foreground/10 text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{getPairName(pairId)}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {kingFinished && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto text-accent mb-2" />
              <h3 className="font-display text-lg font-bold">¡Torneo finalizado!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Último rey: <span className="font-semibold text-foreground">{kingCourtPairId ? getPairName(kingCourtPairId) : '—'}</span>
              </p>
              <p className="text-xs text-muted-foreground">con {kingWinStreak} victoria{kingWinStreak > 1 ? 's' : ''} consecutiva{kingWinStreak > 1 ? 's' : ''}</p>
            </div>
          )}

          {!kingCurrentChallenger && !kingFinished && kingQueue.length === 0 && pairs.length >= 2 && (
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">No quedan más retadores en la cola.</p>
              <p className="text-xs text-muted-foreground mt-1">Añade más parejas para continuar.</p>
            </div>
          )}

          {kingHistory.length > 0 && (
            <div className="rounded-xl bg-card p-4 shadow-card">
              <h3 className="font-display text-sm font-semibold mb-3">📋 Historial de partidos</h3>
              <div className="flex flex-col gap-2">
                {kingHistory.map((m, i) => {
                  const winner = getPairName(m.winnerId || '');
                  const loser = getPairName(m.winnerId === m.courtPairId ? m.challengerPairId : m.courtPairId);
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs rounded-lg bg-muted p-2.5">
                      <span className="font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <span className="font-semibold text-success">{winner}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-destructive">{loser}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === ROUND ROBIN: Clasificación === */}
      {isRoundRobin && rrStandings.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">
            <Trophy className="h-4 w-4 inline mr-1" />
            Clasificación — Liga
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-2 text-left">#</th>
                  <th className="py-2 pr-2 text-left">Pareja</th>
                  <th className="py-2 px-2 text-center">PJ</th>
                  <th className="py-2 px-2 text-center">V</th>
                  <th className="py-2 px-2 text-center">D</th>
                  <th className="py-2 pl-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rrStandings.map((s, i) => (
                  <tr key={s.pairId} className={`border-b border-border/50 ${i === 0 ? 'bg-primary/5' : ''}`}>
                    <td className="py-2 pr-2 font-bold text-primary">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium truncate max-w-[140px]">{getPairName(s.pairId)}</td>
                    <td className="py-2 px-2 text-center text-muted-foreground">{s.played}</td>
                    <td className="py-2 px-2 text-center text-success font-medium">{s.wins}</td>
                    <td className="py-2 px-2 text-center text-destructive font-medium">{s.losses}</td>
                    <td className="py-2 pl-2 text-center font-bold">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ROUND ROBIN: Partidos === */}
      {isRoundRobin && rrMatches.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">
            Partidos ({rrMatches.filter(m => m.played).length}/{rrMatches.length})
          </h3>
          <div className="flex flex-col gap-2">
            {rrMatches.map(match => {
              const canSelect = !isTournamentLocked && !match.played;
              return (
                <div key={match.id} className={`rounded-lg border p-3 text-xs ${match.played ? 'border-border bg-muted/30' : 'border-border bg-card'}`}>
                  <div
                    className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                      match.winnerId === match.pair1Id ? 'bg-success/10 font-semibold text-success' : ''
                    } ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                    onClick={() => canSelect && handleRRSelectWinner(match.id, match.pair1Id)}
                  >
                    <span>{getPairName(match.pair1Id)}</span>
                    {match.winnerId === match.pair1Id && <Check className="h-3 w-3 text-success" />}
                    {canSelect && <span className="text-[9px] text-primary">Elegir</span>}
                  </div>
                  <div className="h-px bg-border my-0.5" />
                  <div
                    className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                      match.winnerId === match.pair2Id ? 'bg-success/10 font-semibold text-success' : ''
                    } ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                    onClick={() => canSelect && handleRRSelectWinner(match.id, match.pair2Id)}
                  >
                    <span>{getPairName(match.pair2Id)}</span>
                    {match.winnerId === match.pair2Id && <Check className="h-3 w-3 text-success" />}
                    {canSelect && <span className="text-[9px] text-primary">Elegir</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === ELIMINATION: Bracket === */}
      {!isRoundRobin && !isKingMode && bracket.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">
            <Trophy className="h-4 w-4 inline mr-1" />
            Cuadro — {bracket.length} rondas
          </h3>
          <div className="overflow-x-auto">
            <BracketView
              rounds={bracket}
              pairs={MOCK_PAIRS.filter(p => p.tournamentId === id)}
              onSelectWinner={handleSelectWinner}
              eloChanges={eloChanges}
              locked={isTournamentLocked}
            />
          </div>
        </div>
      )}

      {/* ELO Changes log */}
      {eloChanges.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">📊 Cambios de ELO</h3>
          <div className="flex flex-col gap-3">
            {eloChanges.map((ec, i) => (
              <div key={i} className="rounded-lg bg-muted p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Partido {ec.matchKey}</p>
                  {ec.hasGuests && (
                    <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[9px] font-semibold text-warning-foreground">Con invitados</span>
                  )}
                </div>

                {ec.changes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin cambios aplicables.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {ec.changes.map((c, j) => (
                      <div key={j} className="rounded-md bg-card/70 p-2">
                        <div className="flex items-center justify-between text-xs py-0.5">
                          <span className="font-medium">{c.displayName} <span className="text-muted-foreground">({c.position})</span></span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">{c.previousElo}</span>
                            <span className={c.change > 0 ? 'text-success font-semibold' : c.change < 0 ? 'text-destructive font-semibold' : 'text-muted-foreground font-semibold'}>
                              {c.change >= 0 ? `+${c.change}` : c.change}
                            </span>
                            <span className="font-bold">{c.newElo}</span>
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                          <span>Cambio bruto: <span className="font-semibold text-foreground">{c.rawChange >= 0 ? `+${c.rawChange}` : c.rawChange}</span></span>
                          {c.multiplier < 1 && (
                            <span>×{c.multiplier} (invitados)</span>
                          )}
                          {c.contextCoefficient !== 1 && (
                            <span>×{c.contextCoefficient.toFixed(2)} (contexto)</span>
                          )}
                          <span>Aplicado total: <span className="font-semibold text-foreground">{c.totalAppliedChange >= 0 ? `+${c.totalAppliedChange}` : c.totalAppliedChange}</span></span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                          <span>Pos: {c.change >= 0 ? `+${c.change}` : c.change}</span>
                          <span>Gen: {c.generalChange >= 0 ? `+${c.generalChange}` : c.generalChange} ({c.previousGeneral}→{c.newGeneral})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Corrections */}
      {(() => {
        const currentUser = getCurrentUser();
        const isOrganizer = currentUser && tournament.organizerId === currentUser.id;
        const corrections = getCorrections(tournament.id);
        if (!isOrganizer && corrections.length === 0) return null;
        return (
          <div className="rounded-xl bg-card p-4 shadow-card mb-4">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" /> Correcciones de resultados
            </h3>
            {isOrganizer && eloChanges.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Puedes revertir resultados seleccionando un nuevo ganador en el bracket o partidos.
              </p>
            )}
            {corrections.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {corrections.map((c, i) => (
                  <div key={i} className="rounded-lg bg-muted p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Partido {c.matchKey}</span>
                      <span className="text-muted-foreground">{new Date(c.date).toLocaleDateString('es-ES')}</span>
                    </div>
                    {c.reason && <p className="text-muted-foreground mt-0.5">{c.reason}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay correcciones registradas.</p>
            )}
          </div>
        );
      })()}

      {/* === FINALIZAR TORNEO + MVP === */}
      {isOrganizer && !isTournamentLocked && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4 border-2 border-accent/30">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-accent" /> Finalizar torneo
          </h3>

          <p className="text-xs text-muted-foreground mb-3">
            {canFinalizeTournament
              ? (isKingMode 
                  ? 'Cierra el torneo. En Rey de la mesa no hay MVP (el rey ya acumula ELO).'
                  : 'Selecciona MVP y cierra el torneo. Al cerrar se guardan ganador, MVP y estadísticas.')
              : 'Aún no se puede finalizar: primero debe quedar definida la pareja ganadora.'}
          </p>

          <button
            onClick={() => {
              if (!canFinalizeTournament) return;
              if (isKingMode) {
                // King mode: finalize without MVP
                finalizeTournament(tournament.id, finalWinnerPairId);
                forceUpdate(n => n + 1);
                toast.success('Torneo finalizado correctamente.');
              } else {
                setSelectedMvpId(tournament.mvpPlayerId || uniqueTournamentPlayers[0]?.userId || '');
                setShowFinalizeDialog(true);
              }
            }}
            disabled={!canFinalizeTournament}
            className="w-full rounded-xl bg-accent py-3 text-center font-display font-semibold text-accent-foreground transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🏆 Finalizar torneo
          </button>
        </div>
      )}


      {!isTeamTournament && !isIndividualMode && (tournament.status === 'abierto' || tournament.status === 'en_curso') && pairs.length < tournament.maxPairs && (
        <button
          onClick={() => setShowEnrollDialog(true)}
          className="w-full rounded-xl bg-secondary py-3.5 text-center font-display font-semibold text-secondary-foreground transition active:scale-[0.98]"
        >
          Inscribir pareja
        </button>
      )}

      {showFinalizeDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-elevated">
            <h3 className="font-display text-lg font-bold mb-3">Finalizar torneo</h3>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Jugador del torneo (MVP)</label>
            <select
              value={selectedMvpId}
              onChange={e => setSelectedMvpId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar MVP...</option>
              {uniqueTournamentPlayers.map(player => (
                <option key={player.userId} value={player.userId}>{player.displayName}</option>
              ))}
            </select>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowFinalizeDialog(false)}
                className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!finalWinnerPairId) {
                    toast.error('No hay pareja ganadora definida para finalizar.');
                    return;
                  }
                  const mvpPlayer = uniqueTournamentPlayers.find(p => p.userId === selectedMvpId);
                  if (!mvpPlayer) {
                    toast.error('Selecciona un MVP para finalizar.');
                    return;
                  }
                  setTournamentMvp(tournament.id, mvpPlayer.userId, mvpPlayer.displayName);
                  finalizeTournament(tournament.id, finalWinnerPairId);
                  setShowFinalizeDialog(false);
                  forceUpdate(n => n + 1);
                  toast.success('Torneo finalizado y MVP guardado correctamente.');
                }}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLLMENT DIALOG */}
      {showEnrollDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Inscribir pareja</h3>
              <button onClick={resetEnrollDialog}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Goalkeeper slot */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Portero</span>
                </div>

                {/* Player type toggle */}
                <div className="flex gap-1 mb-2">
                  <button onClick={() => { setGkPlayerType('registrado'); setSelectedGoalkeeper(null); setGoalkeeperSearch(''); }}
                    className={`flex items-center gap-1 flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${gkPlayerType === 'registrado' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}>
                    <UserCheck className="h-3 w-3" /> Registrado
                  </button>
                  <button onClick={() => { setGkPlayerType('invitado'); setSelectedGoalkeeper(null); setGoalkeeperSearch(''); }}
                    className={`flex items-center gap-1 flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${gkPlayerType === 'invitado' ? 'bg-warning text-warning-foreground' : 'bg-card text-muted-foreground'}`}>
                    <UserPlus className="h-3 w-3" /> Invitado
                  </button>
                </div>

                {selectedGoalkeeper ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{selectedGoalkeeper.displayName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">ELO Portero: {selectedGoalkeeper.elo}</span>
                      <PlayerTypeBadge type={selectedGoalkeeper.playerType} userId={selectedGoalkeeper.userId} />
                    </div>
                    <button onClick={() => { setSelectedGoalkeeper(null); setGoalkeeperSearch(''); }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={gkPlayerType === 'invitado' ? 'Nombre del invitado...' : 'Buscar jugador por nombre...'}
                        value={goalkeeperSearch}
                        onChange={e => setGoalkeeperSearch(e.target.value)}
                      />
                    </div>
                    {gkPlayerType === 'invitado' && goalkeeperSearch.trim().length >= 2 && (
                      <div className="mt-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Código postal (opcional)</label>
                        <input
                          className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Ej: 28001"
                          value={gkPostalCode}
                          onChange={e => setGkPostalCode(e.target.value)}
                        />
                        <p className="mt-1 text-[10px] text-warning-foreground">👤 Se añadirá como jugador invitado (sin ranking)</p>
                      </div>
                    )}
                    {goalkeeperResults.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card">
                        {goalkeeperResults.map(p => (
                          <button
                            key={p.userId}
                            onClick={() => {
                              setSelectedGoalkeeper({ userId: p.userId, displayName: p.displayName, elo: p.asGoalkeeper, playerType: p.playerType || 'registrado' });
                              setGoalkeeperSearch('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{p.displayName}</span>
                              <span className="rounded bg-success/10 px-1 py-0.5 text-[9px] font-semibold text-success">✓ Reg.</span>
                            </div>
                            <span className="text-xs text-muted-foreground">ELO: {p.asGoalkeeper}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {gkPlayerType === 'registrado' && goalkeeperSearch.trim().length >= 2 && goalkeeperResults.length === 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        No encontrado. Se creará como nuevo jugador con ELO base 1500.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Forward slot */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Delantero</span>
                </div>

                {/* Player type toggle */}
                <div className="flex gap-1 mb-2">
                  <button onClick={() => { setFwPlayerType('registrado'); setSelectedForward(null); setForwardSearch(''); }}
                    className={`flex items-center gap-1 flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${fwPlayerType === 'registrado' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}>
                    <UserCheck className="h-3 w-3" /> Registrado
                  </button>
                  <button onClick={() => { setFwPlayerType('invitado'); setSelectedForward(null); setForwardSearch(''); }}
                    className={`flex items-center gap-1 flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${fwPlayerType === 'invitado' ? 'bg-warning text-warning-foreground' : 'bg-card text-muted-foreground'}`}>
                    <UserPlus className="h-3 w-3" /> Invitado
                  </button>
                </div>

                {selectedForward ? (
                  <div className="flex items-center justify-between rounded-lg border border-secondary bg-secondary/5 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{selectedForward.displayName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">ELO Delantero: {selectedForward.elo}</span>
                      <PlayerTypeBadge type={selectedForward.playerType} userId={selectedForward.userId} />
                    </div>
                    <button onClick={() => { setSelectedForward(null); setForwardSearch(''); }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={fwPlayerType === 'invitado' ? 'Nombre del invitado...' : 'Buscar jugador por nombre...'}
                        value={forwardSearch}
                        onChange={e => setForwardSearch(e.target.value)}
                      />
                    </div>
                    {fwPlayerType === 'invitado' && forwardSearch.trim().length >= 2 && (
                      <div className="mt-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Código postal (opcional)</label>
                        <input
                          className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Ej: 28001"
                          value={fwPostalCode}
                          onChange={e => setFwPostalCode(e.target.value)}
                        />
                        <p className="mt-1 text-[10px] text-warning-foreground">👤 Se añadirá como jugador invitado (sin ranking)</p>
                      </div>
                    )}
                    {forwardResults.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card">
                        {forwardResults.map(p => (
                          <button
                            key={p.userId}
                            onClick={() => {
                              setSelectedForward({ userId: p.userId, displayName: p.displayName, elo: p.asForward, playerType: p.playerType || 'registrado' });
                              setForwardSearch('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{p.displayName}</span>
                              <span className="rounded bg-success/10 px-1 py-0.5 text-[9px] font-semibold text-success">✓ Reg.</span>
                            </div>
                            <span className="text-xs text-muted-foreground">ELO: {p.asForward}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {fwPlayerType === 'registrado' && forwardSearch.trim().length >= 2 && forwardResults.length === 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        No encontrado. Se creará como nuevo jugador con ELO base 1500.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={resetEnrollDialog}
                className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnrollPair}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Inscribir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL ENROLLMENT DIALOG */}
      {showIndividualEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Inscribir jugador</h3>
              <button onClick={() => { setShowIndividualEnroll(false); setIndividualSearch(''); setSelectedIndividual(null); setIndividualPlayerType('registrado'); setIndividualGuestPostalCode(''); setIndividualGuestPosition(''); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Player type toggle */}
            <div className="flex gap-1 mb-3">
              <button onClick={() => { setIndividualPlayerType('registrado'); setSelectedIndividual(null); setIndividualSearch(''); }}
                className={`flex items-center gap-1 flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${individualPlayerType === 'registrado' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <UserCheck className="h-3 w-3" /> Registrado
              </button>
              <button onClick={() => { setIndividualPlayerType('invitado'); setSelectedIndividual(null); setIndividualSearch(''); }}
                className={`flex items-center gap-1 flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${individualPlayerType === 'invitado' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'}`}>
                <UserPlus className="h-3 w-3" /> Invitado
              </button>
            </div>

            {individualPlayerType === 'invitado' ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nombre del invitado *</label>
                  <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Nombre..." value={individualSearch} onChange={e => setIndividualSearch(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Código postal (opcional)</label>
                  <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: 28001" value={individualGuestPostalCode} onChange={e => setIndividualGuestPostalCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Posición preferida (opcional)</label>
                  <div className="flex gap-1 mt-1">
                    {(['', 'portero', 'delantero'] as const).map(pos => (
                      <button key={pos} onClick={() => setIndividualGuestPosition(pos)}
                        className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${individualGuestPosition === pos ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {pos === '' ? 'Sin preferencia' : pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-warning-foreground flex items-center gap-1">👤 Se usará ELO neutro (1500). No afecta al ranking global.</p>
              </div>
            ) : (
              <>
                {selectedIndividual ? (
                  <div className="rounded-lg border border-primary bg-primary/5 px-3 py-2 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{selectedIndividual.displayName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">ELO: {selectedIndividual.elo}</span>
                        {selectedIndividual.preferredPosition && <span className="ml-1 text-xs text-primary capitalize">({selectedIndividual.preferredPosition})</span>}
                      </div>
                      <button onClick={() => { setSelectedIndividual(null); setIndividualSearch(''); }}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Buscar jugador..." value={individualSearch} onChange={e => setIndividualSearch(e.target.value)} />
                    </div>
                    {individualSearchResults.length > 0 && (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-card">
                        {individualSearchResults.map(p => (
                          <button key={p.userId} onClick={() => { setSelectedIndividual({ userId: p.userId, displayName: p.displayName, elo: p.general, preferredPosition: p.preferredPosition, playerType: p.playerType }); setIndividualSearch(''); }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{p.displayName}</span>
                              {p.preferredPosition && <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary capitalize">{p.preferredPosition}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground">ELO: {p.general}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setShowIndividualEnroll(false); setIndividualSearch(''); setSelectedIndividual(null); setIndividualPlayerType('registrado'); }} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={() => { handleIndividualEnroll(); if (individualPlayerType === 'registrado') setShowIndividualEnroll(false); }} disabled={individualPlayerType === 'registrado' ? !selectedIndividual : individualSearch.trim().length < 2} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Inscribir</button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM ENROLLMENT DIALOG */}
      {showTeamEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Inscribir equipo</h3>
              <button onClick={() => setShowTeamEnroll(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-2">
              {allTeams.filter(t => !(tournament.enrolledTeamIds || []).includes(t.id)).map(team => {
                const members = getTeamMembers(team.id).filter(m => m.status === 'aceptada');
                const hasEnoughMembers = members.length >= 2;
                return (
                  <button key={team.id} onClick={() => {
                    if (!hasEnoughMembers) { toast.error(`El equipo "${team.name}" necesita al menos 2 miembros para competir`); return; }
                    handleTeamEnroll(team.id);
                  }} className={`flex items-center gap-3 rounded-lg bg-muted p-3 text-left hover:bg-primary/5 transition w-full ${!hasEnoughMembers ? 'opacity-60' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{team.name}</p>
                      <p className="text-[10px] text-muted-foreground">{team.city} · ELO {team.elo} · {members.length} miembros</p>
                      {!hasEnoughMembers && <p className="text-[9px] text-destructive mt-0.5">⚠ Necesita más miembros</p>}
                    </div>
                  </button>
                );
              })}
              {allTeams.filter(t => !(tournament.enrolledTeamIds || []).includes(t.id)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay equipos disponibles.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// === PLAYER TYPE BADGE ===
function PlayerTypeBadge({ type, userId }: { type?: string; userId?: string }) {
  const isGuest = type === 'invitado' || (userId && isGuestPlayer(userId));
  if (isGuest) {
    return <span className="rounded bg-warning/20 px-1 py-0.5 text-[9px] font-semibold text-warning-foreground">👤 Inv.</span>;
  }
  return null;
}

// === PAIR DISPLAY COMPONENT ===
function PairDisplay({ pair, label }: { pair?: TournamentPair | null; label?: string }) {
  if (!pair) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div>
      {label && <p className="text-[10px] font-semibold text-accent-foreground mb-1">{label}</p>}
      <div className="flex items-center gap-1.5">
        <Shield className="h-3 w-3 text-primary shrink-0" />
        <span className="text-sm font-medium">{pair.goalkeeper.displayName}</span>
        <span className="text-[10px] text-muted-foreground">{pair.goalkeeper.elo}</span>
        <PlayerTypeBadge type={pair.goalkeeper.playerType} userId={pair.goalkeeper.userId} />
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Target className="h-3 w-3 text-secondary shrink-0" />
        <span className="text-sm font-medium">{pair.forward.displayName}</span>
        <span className="text-[10px] text-muted-foreground">{pair.forward.elo}</span>
        <PlayerTypeBadge type={pair.forward.playerType} userId={pair.forward.userId} />
      </div>
    </div>
  );
}

// === BRACKET VIEW COMPONENT ===
function BracketView({
  rounds,
  pairs,
  onSelectWinner,
  eloChanges,
  locked,
}: {
  rounds: BracketMatch[][];
  pairs: TournamentPair[];
  onSelectWinner: (roundIdx: number, matchIdx: number, winnerId: string) => void;
  eloChanges: EloChangeDisplay[];
  locked: boolean;
}) {
  const getPairName = (pairId?: string) => {
    if (!pairId) return '—';
    const pair = pairs.find(p => p.id === pairId);
    if (!pair) return '—';
    return `${pair.goalkeeper.displayName.split(' ')[0]} / ${pair.forward.displayName.split(' ')[0]}`;
  };

  return (
    <div className="flex gap-4 min-w-max">
      {rounds.map((round, ri) => (
        <div key={ri} className="flex flex-col justify-around gap-2" style={{ minWidth: 180 }}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {ri === rounds.length - 1 ? 'Final' : `Ronda ${ri + 1}`}
          </p>
          {round.map((match, mi) => {
            const canSelect = !locked && !match.winnerId && !match.isBye && Boolean(match.pair1Id) && Boolean(match.pair2Id);
            const canCorrect = !locked && match.winnerId && !match.isBye && Boolean(match.pair1Id) && Boolean(match.pair2Id);
            
            const p1 = match.pair1Id;
            const p2 = match.pair2Id;

            return (
              <div key={match.position} className={`rounded-lg border p-2 text-xs ${match.isBye ? 'border-dashed border-muted bg-muted/30' : 'border-border bg-card'}`}>
                {p1 || p2 ? (
                  <>
                    <div
                      className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                        match.winnerId === p1 && p1 ? 'bg-success/10 font-semibold text-success' : ''
                      } ${canSelect || canCorrect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                      onClick={() => (canSelect || canCorrect) && p1 && match.winnerId !== p1 && onSelectWinner(ri, mi, p1)}
                    >
                      <span className={!p1 ? 'text-muted-foreground italic' : ''}>{p1 ? getPairName(p1) : 'Bye'}</span>
                      {match.winnerId === p1 && p1 && <Check className="h-3 w-3 text-success" />}
                      {canSelect && !match.winnerId && p1 && <span className="text-[9px] text-primary">Elegir</span>}
                      {canCorrect && match.winnerId && match.winnerId !== p1 && p1 && <span className="text-[9px] text-warning">Corregir</span>}
                    </div>
                    <div className="h-px bg-border my-0.5" />
                    <div
                      className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                        match.winnerId === p2 && p2 ? 'bg-success/10 font-semibold text-success' : ''
                      } ${canSelect || canCorrect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                      onClick={() => (canSelect || canCorrect) && p2 && match.winnerId !== p2 && onSelectWinner(ri, mi, p2)}
                    >
                      <span className={!p2 ? 'text-muted-foreground italic' : ''}>{p2 ? getPairName(p2) : 'Bye'}</span>
                      {match.winnerId === p2 && p2 && <Check className="h-3 w-3 text-success" />}
                      {canSelect && !match.winnerId && p2 && <span className="text-[9px] text-primary">Elegir</span>}
                      {canCorrect && match.winnerId && match.winnerId !== p2 && p2 && <span className="text-[9px] text-warning">Corregir</span>}
                    </div>
                  </>
                ) : (
                  <div className="py-3 text-center text-muted-foreground italic text-[10px]">Vacío</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
