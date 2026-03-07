import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_TOURNAMENTS, MOCK_PAIRS, MOCK_RANKINGS, searchPlayers, findOrCreatePlayer } from '@/data/mock';
import { ArrowLeft, Calendar, MapPin, Users, Shield, Target, Trophy, Check, Plus, X, Search, Crown, Clock, ChevronRight } from 'lucide-react';
import { generateBracket, type BracketMatch, calculate2v2EloChanges, generateRoundRobinMatches, calculateRoundRobinStandings } from '@/lib/bracket';
import { TournamentPair, RoundRobinMatch } from '@/types';
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
  changes: {
    userId: string;
    displayName: string;
    position: string;
    previousElo: number;
    newElo: number;
    change: number;
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

  const [eloChanges, setEloChanges] = useState<EloChangeDisplay[]>([]);
  const [, forceUpdate] = useState(0);

  // === ENROLLMENT ===
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [goalkeeperSearch, setGoalkeeperSearch] = useState('');
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedGoalkeeper, setSelectedGoalkeeper] = useState<{ userId: string; displayName: string; elo: number } | null>(null);
  const [selectedForward, setSelectedForward] = useState<{ userId: string; displayName: string; elo: number } | null>(null);

  const goalkeeperResults = useMemo(() => searchPlayers(goalkeeperSearch), [goalkeeperSearch]);
  const forwardResults = useMemo(() => searchPlayers(forwardSearch), [forwardSearch]);

  const handleEnrollPair = () => {
    const gkName = selectedGoalkeeper?.displayName || goalkeeperSearch.trim();
    const fwName = selectedForward?.displayName || forwardSearch.trim();

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

    // FIX #3: Use position-specific ELO
    const gk = selectedGoalkeeper || findOrCreatePlayer(gkName, tournament.city, 'portero');
    const fw = selectedForward || findOrCreatePlayer(fwName, tournament.city, 'delantero');

    const newPair: TournamentPair = {
      id: `p_${Date.now()}`,
      tournamentId: tournament.id,
      goalkeeper: {
        userId: gk.userId,
        displayName: gk.displayName,
        elo: gk.elo,
      },
      forward: {
        userId: fw.userId,
        displayName: fw.displayName,
        elo: fw.elo,
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
      // Add to queue for King mode
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

    setGoalkeeperSearch('');
    setForwardSearch('');
    setSelectedGoalkeeper(null);
    setSelectedForward(null);
    setShowEnrollDialog(false);
    toast.success('Pareja inscrita correctamente');
    forceUpdate(n => n + 1);
  };

  // === ELO UPDATE HELPER ===
  const applyEloChanges = useCallback((winnerId: string, loserId: string, matchKey: string) => {
    const allPairs = MOCK_PAIRS.filter(p => p.tournamentId === id);
    const winnerPair = allPairs.find(p => p.id === winnerId);
    const loserPair = allPairs.find(p => p.id === loserId);

    if (winnerPair && loserPair) {
      const eloResult = calculate2v2EloChanges(
        winnerPair.goalkeeper.elo,
        winnerPair.forward.elo,
        loserPair.goalkeeper.elo,
        loserPair.forward.elo,
      );

      const changes: EloChangeDisplay['changes'] = [];

      const updateRanking = (userId: string, displayName: string, change: number, position: string) => {
        const ranking = MOCK_RANKINGS.find(r => r.userId === userId);
        if (ranking) {
          const prevElo = position === 'portero' ? ranking.asGoalkeeper : ranking.asForward;
          ranking.general += change;
          if (position === 'portero') ranking.asGoalkeeper += change;
          else ranking.asForward += change;
          changes.push({ userId, displayName, position, previousElo: prevElo, newElo: position === 'portero' ? ranking.asGoalkeeper : ranking.asForward, change });
        }
      };

      updateRanking(winnerPair.goalkeeper.userId, winnerPair.goalkeeper.displayName, eloResult.winnerGoalkeeperChange, 'portero');
      updateRanking(winnerPair.forward.userId, winnerPair.forward.displayName, eloResult.winnerForwardChange, 'delantero');
      updateRanking(loserPair.goalkeeper.userId, loserPair.goalkeeper.displayName, eloResult.loserGoalkeeperChange, 'portero');
      updateRanking(loserPair.forward.userId, loserPair.forward.displayName, eloResult.loserForwardChange, 'delantero');

      const wGk = MOCK_RANKINGS.find(r => r.userId === winnerPair.goalkeeper.userId);
      const wFw = MOCK_RANKINGS.find(r => r.userId === winnerPair.forward.userId);
      const lGk = MOCK_RANKINGS.find(r => r.userId === loserPair.goalkeeper.userId);
      const lFw = MOCK_RANKINGS.find(r => r.userId === loserPair.forward.userId);
      if (wGk) wGk.wins++;
      if (wFw) wFw.wins++;
      if (lGk) lGk.losses++;
      if (lFw) lFw.losses++;

      setEloChanges(prev => [...prev, { matchKey, changes }]);
      toast.success('Ganador registrado. ELO actualizado.');
    }
  }, [id]);

  // === BRACKET: Select winner (elimination) ===
  const handleSelectWinner = useCallback((roundIdx: number, matchIdx: number, winnerId: string) => {
    setBracket(prev => {
      const newBracket = prev.map(r => r.map(m => ({ ...m })));
      const match = newBracket[roundIdx][matchIdx];
      if (match.winnerId) return prev;
      match.winnerId = winnerId;

      const loserId = match.pair1Id === winnerId ? match.pair2Id : match.pair1Id;
      if (loserId) {
        applyEloChanges(winnerId, loserId, `${roundIdx}-${matchIdx}`);
      }

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
  }, [applyEloChanges]);

  // === ROUND ROBIN: Select winner ===
  const handleRRSelectWinner = useCallback((matchId: string, winnerId: string) => {
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
    if (!kingCourtPairId || !kingCurrentChallenger) return;

    const loserId = winnerId === kingCourtPairId ? kingCurrentChallenger : kingCourtPairId;
    const matchId = `king_${kingHistory.length}`;

    // Record match
    setKingHistory(prev => [...prev, {
      id: matchId,
      courtPairId: kingCourtPairId,
      challengerPairId: kingCurrentChallenger,
      winnerId,
    }]);

    // Apply ELO
    applyEloChanges(winnerId, loserId, matchId);

    // Update court: winner stays, loser exits
    if (winnerId === kingCourtPairId) {
      // Court pair wins, stays
      setKingWinStreak(prev => prev + 1);
    } else {
      // Challenger wins, becomes new court pair
      setKingCourtPairId(winnerId);
      setKingWinStreak(1);
    }

    // Next challenger from queue
    if (kingQueue.length > 0) {
      setKingCurrentChallenger(kingQueue[0]);
      setKingQueue(q => q.slice(1));
    } else {
      setKingCurrentChallenger(null);
    }

    forceUpdate(n => n + 1);
  }, [kingCourtPairId, kingCurrentChallenger, kingQueue, kingHistory.length, applyEloChanges]);

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

  // Round Robin standings
  const rrStandings = isRoundRobin ? calculateRoundRobinStandings(MOCK_PAIRS.filter(p => p.tournamentId === id), rrMatches) : [];

  // King mode: check if finished
  const kingFinished = isKingMode && !kingCurrentChallenger && kingHistory.length > 0;

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

      {/* Parejas inscritas */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold">Parejas inscritas ({pairs.length})</h3>
          {pairs.length < tournament.maxPairs && (
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
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Target className="h-3 w-3 text-secondary shrink-0" />
                    <span className="text-sm font-medium truncate">{pair.forward.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{pair.forward.elo}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{pair.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay parejas inscritas aún. ¡Añade la primera!</p>
        )}
      </div>

      {/* === REY DE LA MESA VIEW === */}
      {isKingMode && pairs.length >= 2 && (
        <div className="space-y-4 mb-4">
          {/* Current court */}
          <div className="rounded-xl bg-card p-4 shadow-card border-2 border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-accent" />
              <h3 className="font-display text-sm font-bold">En pista</h3>
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

          {/* Current match */}
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

          {/* Queue */}
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

          {/* Finished */}
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

          {/* No more challengers */}
          {!kingCurrentChallenger && !kingFinished && kingQueue.length === 0 && pairs.length >= 2 && (
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">No quedan más retadores en la cola.</p>
              <p className="text-xs text-muted-foreground mt-1">Añade más parejas para continuar.</p>
            </div>
          )}

          {/* History */}
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
                      <span className="font-semibold text-green-700">{winner}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-red-500">{loser}</span>
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
                    <td className="py-2 px-2 text-center text-green-600 font-medium">{s.wins}</td>
                    <td className="py-2 px-2 text-center text-red-500 font-medium">{s.losses}</td>
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
              const canSelect = !match.played;
              return (
                <div key={match.id} className={`rounded-lg border p-3 text-xs ${match.played ? 'border-border bg-muted/30' : 'border-border bg-card'}`}>
                  <div
                    className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                      match.winnerId === match.pair1Id ? 'bg-green-50 font-semibold text-green-800' : ''
                    } ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                    onClick={() => canSelect && handleRRSelectWinner(match.id, match.pair1Id)}
                  >
                    <span>{getPairName(match.pair1Id)}</span>
                    {match.winnerId === match.pair1Id && <Check className="h-3 w-3 text-green-600" />}
                    {canSelect && <span className="text-[9px] text-primary">Elegir</span>}
                  </div>
                  <div className="h-px bg-border my-0.5" />
                  <div
                    className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                      match.winnerId === match.pair2Id ? 'bg-green-50 font-semibold text-green-800' : ''
                    } ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                    onClick={() => canSelect && handleRRSelectWinner(match.id, match.pair2Id)}
                  >
                    <span>{getPairName(match.pair2Id)}</span>
                    {match.winnerId === match.pair2Id && <Check className="h-3 w-3 text-green-600" />}
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
                <p className="text-xs font-semibold text-muted-foreground mb-2">Partido {ec.matchKey}</p>
                {ec.changes.map((c, j) => (
                  <div key={j} className="flex items-center justify-between text-xs py-0.5">
                    <span className="font-medium">{c.displayName} <span className="text-muted-foreground">({c.position})</span></span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">{c.previousElo}</span>
                      <span className={c.change >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                        {c.change >= 0 ? `+${c.change}` : c.change}
                      </span>
                      <span className="font-bold">{c.newElo}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {(tournament.status === 'abierto' || tournament.status === 'en_curso') && pairs.length < tournament.maxPairs && (
        <button
          onClick={() => setShowEnrollDialog(true)}
          className="w-full rounded-xl bg-secondary py-3.5 text-center font-display font-semibold text-secondary-foreground transition active:scale-[0.98]"
        >
          Inscribir pareja
        </button>
      )}

      {/* ENROLLMENT DIALOG */}
      {showEnrollDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Inscribir pareja</h3>
              <button onClick={() => { setShowEnrollDialog(false); setGoalkeeperSearch(''); setForwardSearch(''); setSelectedGoalkeeper(null); setSelectedForward(null); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Goalkeeper */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Portero</span>
                </div>
                {selectedGoalkeeper ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{selectedGoalkeeper.displayName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">ELO Portero: {selectedGoalkeeper.elo}</span>
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
                        placeholder="Buscar jugador por nombre..."
                        value={goalkeeperSearch}
                        onChange={e => setGoalkeeperSearch(e.target.value)}
                      />
                    </div>
                    {goalkeeperResults.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card">
                        {goalkeeperResults.map(p => (
                          <button
                            key={p.userId}
                            onClick={() => {
                              // FIX #3: Use goalkeeper-specific ELO
                              setSelectedGoalkeeper({ userId: p.userId, displayName: p.displayName, elo: p.asGoalkeeper });
                              setGoalkeeperSearch('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition"
                          >
                            <span className="font-medium">{p.displayName}</span>
                            <span className="text-xs text-muted-foreground">ELO Portero: {p.asGoalkeeper}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {goalkeeperSearch.trim().length >= 2 && goalkeeperResults.length === 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        No encontrado. Se creará como nuevo jugador con ELO base 1500.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Forward */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Delantero</span>
                </div>
                {selectedForward ? (
                  <div className="flex items-center justify-between rounded-lg border border-secondary bg-secondary/5 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{selectedForward.displayName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">ELO Delantero: {selectedForward.elo}</span>
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
                        placeholder="Buscar jugador por nombre..."
                        value={forwardSearch}
                        onChange={e => setForwardSearch(e.target.value)}
                      />
                    </div>
                    {forwardResults.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card">
                        {forwardResults.map(p => (
                          <button
                            key={p.userId}
                            onClick={() => {
                              // FIX #3: Use forward-specific ELO
                              setSelectedForward({ userId: p.userId, displayName: p.displayName, elo: p.asForward });
                              setForwardSearch('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition"
                          >
                            <span className="font-medium">{p.displayName}</span>
                            <span className="text-xs text-muted-foreground">ELO Delantero: {p.asForward}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {forwardSearch.trim().length >= 2 && forwardResults.length === 0 && (
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
                onClick={() => { setShowEnrollDialog(false); setGoalkeeperSearch(''); setForwardSearch(''); setSelectedGoalkeeper(null); setSelectedForward(null); }}
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
    </PageShell>
  );
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
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Target className="h-3 w-3 text-secondary shrink-0" />
        <span className="text-sm font-medium">{pair.forward.displayName}</span>
        <span className="text-[10px] text-muted-foreground">{pair.forward.elo}</span>
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
}: {
  rounds: BracketMatch[][];
  pairs: TournamentPair[];
  onSelectWinner: (roundIdx: number, matchIdx: number, winnerId: string) => void;
  eloChanges: EloChangeDisplay[];
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
            const canSelect = !match.winnerId && !match.isBye && match.pair1Id && match.pair2Id;

            return (
              <div key={match.position} className={`rounded-lg border p-2 text-xs ${match.isBye ? 'border-dashed border-muted bg-muted/30' : 'border-border bg-card'}`}>
                <div
                  className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                    match.winnerId === match.pair1Id && match.pair1Id ? 'bg-green-50 font-semibold text-green-800' : ''
                  } ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                  onClick={() => canSelect && match.pair1Id && onSelectWinner(ri, mi, match.pair1Id)}
                >
                  <span>{getPairName(match.pair1Id)}</span>
                  {match.winnerId === match.pair1Id && match.pair1Id && <Check className="h-3 w-3 text-green-600" />}
                  {canSelect && !match.winnerId && <span className="text-[9px] text-primary">Elegir</span>}
                </div>
                <div className="h-px bg-border my-0.5" />
                <div
                  className={`px-2 py-1.5 rounded flex items-center justify-between gap-1 ${
                    match.winnerId === match.pair2Id && match.pair2Id ? 'bg-green-50 font-semibold text-green-800' : ''
                  } ${canSelect ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                  onClick={() => canSelect && match.pair2Id && onSelectWinner(ri, mi, match.pair2Id)}
                >
                  <span>{getPairName(match.pair2Id)}</span>
                  {match.winnerId === match.pair2Id && match.pair2Id && <Check className="h-3 w-3 text-green-600" />}
                  {canSelect && !match.winnerId && <span className="text-[9px] text-primary">Elegir</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
