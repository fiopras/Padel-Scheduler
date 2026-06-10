import { Player, Match, TournamentConfig } from '../types';

/**
 * Normalizes two player IDs into a single sorted string key for tracking relations
 */
const getRelationKey = (id1: string, id2: string): string => {
  return [id1, id2].sort().join(':');
};

/**
 * Gets the minimum count of times a player has partnered with anyone else in the tournament
 */
const getMinPartnerCount = (
  playerId: string,
  players: Player[],
  partnerCount: Record<string, number>
): number => {
  let minVal = Infinity;
  for (const p of players) {
    if (p.id === playerId) continue;
    const key = [playerId, p.id].sort().join(':');
    const count = partnerCount[key] || 0;
    if (count < minVal) {
      minVal = count;
    }
  }
  return minVal === Infinity ? 0 : minVal;
};

/**
 * Gets the minimum count of times a player has faced anyone else as an opponent in the tournament
 */
const getMinOpponentCount = (
  playerId: string,
  players: Player[],
  opponentCount: Record<string, number>
): number => {
  let minVal = Infinity;
  for (const p of players) {
    if (p.id === playerId) continue;
    const key = [playerId, p.id].sort().join(':');
    const count = opponentCount[key] || 0;
    if (count < minVal) {
      minVal = count;
    }
  }
  return minVal === Infinity ? 0 : minVal;
};

/**
 * Generates an event schedule based on player list and tournament configuration
 */
export function generateSchedule(
  players: Player[],
  config: TournamentConfig,
  roundsCount: number
): Match[] {
  if (players.length < 2) return [];
  if (config.format === 'Doubles' && players.length < 4) return [];

  const matches: Match[] = [];

  // Track state for relationship balancing
  const playedCount: Record<string, number> = {};
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};

  // Initialize tracking
  players.forEach((p) => {
    playedCount[p.id] = 0;
  });

  const incrementPartner = (p1: string, p2: string) => {
    const key = getRelationKey(p1, p2);
    partnerCount[key] = (partnerCount[key] || 0) + 1;
  };

  const incrementOpponent = (p1: string, p2: string) => {
    const key = getRelationKey(p1, p2);
    opponentCount[key] = (opponentCount[key] || 0) + 1;
  };

  // Generate round-by-round
  for (let r = 1; r <= roundsCount; r++) {
    // 1. Determine how many courts we can active this round
    const formatSize = config.format === 'Doubles' ? 4 : 2;
    const maxCourtsPossible = Math.floor(players.length / formatSize);
    const activeCourtsCount = Math.min(config.courtCount, maxCourtsPossible);
    const activePlayersNeeded = activeCourtsCount * formatSize;

    if (activePlayersNeeded === 0) break;

    // 2. Select the EXACT set of active players for this round
    // We sort players by:
    // a. Played count ascending
    // b. Consistent tie-breaker (alphabetical ID/name) to be deterministic and prevent any bias
    const roundPlayersPool = [...players].sort((a, b) => {
      const pA = playedCount[a.id] || 0;
      const pB = playedCount[b.id] || 0;
      if (pA !== pB) return pA - pB;
      return a.id.localeCompare(b.id);
    });

    const activePlayersThisRound = roundPlayersPool.slice(0, activePlayersNeeded);

    // 3. For each court in this round, find the absolute best match using fairness scores
    // we greedily pick the best match for each court from the remaining active players of this round
    let remainingActivePlayers = [...activePlayersThisRound];

    for (let c = 1; c <= activeCourtsCount; c++) {
      if (remainingActivePlayers.length < formatSize) break;

      if (config.format === 'Singles') {
        const searchPool = remainingActivePlayers.slice(0, Math.min(remainingActivePlayers.length, 16));
        let bestPair: [Player, Player] | null = null;
        let highestScore = -Infinity;

        for (let i = 0; i < searchPool.length; i++) {
          for (let j = i + 1; j < searchPool.length; j++) {
            const p1 = searchPool[i];
            const p2 = searchPool[j];

            const oCount = opponentCount[getRelationKey(p1.id, p2.id)] || 0;
            const minO_p1 = getMinOpponentCount(p1.id, players, opponentCount);
            const minO_p2 = getMinOpponentCount(p2.id, players, opponentCount);

            let opponentCost = 0;
            if (oCount > 0) {
              opponentCost += oCount * 10000 + oCount * oCount * 30000;
            }

            // Penalty for repeating opponent before all other combinations tried
            if (oCount > minO_p1 || oCount > minO_p2) {
              opponentCost += 200000;
            }

            // Play count balance penalty
            const playCountDiff = Math.abs((playedCount[p1.id] || 0) - (playedCount[p2.id] || 0));
            const balanceCost = playCountDiff * 100;

            const totalCost = opponentCost + balanceCost;
            const fairnessScore = 10000000 - totalCost;

            // Deterministic tie-breaking (by IDs) to avoid any random bias
            if (fairnessScore > highestScore) {
              highestScore = fairnessScore;
              bestPair = [p1, p2];
            } else if (fairnessScore === highestScore) {
              if (!bestPair || (p1.id + p2.id).localeCompare(bestPair[0].id + bestPair[1].id) < 0) {
                bestPair = [p1, p2];
              }
            }
          }
        }

        if (bestPair) {
          const [p1, p2] = bestPair;
          
          // Record metrics
          playedCount[p1.id]++;
          playedCount[p2.id]++;
          incrementOpponent(p1.id, p2.id);

          // Remove scheduled players from active round pool
          remainingActivePlayers = remainingActivePlayers.filter(
            (p) => p.id !== p1.id && p.id !== p2.id
          );

          matches.push({
            id: `M-R${r}-C${c}-${Math.random().toString(36).substr(2, 4)}`,
            courtName: `Court ${c}`,
            round: r,
            format: 'Singles',
            team1: [p1.id],
            team2: [p2.id],
            status: 'Scheduled',
            duration: config.matchDuration,
            timestamp: `Round ${r} • Lap ${c}`
          });
        }

      } else {
        // Doubles (format size = 4)
        // Find best combination of 4 players, and best splitting into 2 teams
        let bestCombination: {
          t1: [Player, Player];
          t2: [Player, Player];
          score: number;
        } | null = null;

        // Take a highly representative subset of active players who need to play this match
        const searchPool = remainingActivePlayers.slice(0, Math.min(remainingActivePlayers.length, 12));
        const len = searchPool.length;

        // Iterate through all combinations of 4 players in the search pool
        for (let i = 0; i < len; i++) {
          for (let j = i + 1; j < len; j++) {
            for (let k = j + 1; k < len; k++) {
              for (let l = k + 1; l < len; l++) {
                const candidates = [
                  searchPool[i],
                  searchPool[j],
                  searchPool[k],
                  searchPool[l],
                ];

                // Possible partitions:
                const options = [
                  { t1: [candidates[0], candidates[1]], t2: [candidates[2], candidates[3]] },
                  { t1: [candidates[0], candidates[2]], t2: [candidates[1], candidates[3]] },
                  { t1: [candidates[0], candidates[3]], t2: [candidates[1], candidates[2]] },
                ];

                for (const opt of options) {
                  const p1 = opt.t1[0];
                  const p2 = opt.t1[1];
                  const p3 = opt.t2[0];
                  const p4 = opt.t2[1];

                  let totalCost = 0;

                  // 1. Partner Costs
                  const partnerPairs = [
                    [p1, p2],
                    [p3, p4],
                  ];

                  for (const [u, v] of partnerPairs) {
                    const pCount = partnerCount[getRelationKey(u.id, v.id)] || 0;
                    if (pCount > 0) {
                      totalCost += pCount * 10000 + pCount * pCount * 50000;
                    }

                    // Strict partner repeat restriction (Balanced Round Robin core)
                    const minP_u = getMinPartnerCount(u.id, players, partnerCount);
                    if (pCount > minP_u) {
                      totalCost += 1000000; // massive penalty
                    }

                    const minP_v = getMinPartnerCount(v.id, players, partnerCount);
                    if (pCount > minP_v) {
                      totalCost += 1000000; // massive penalty
                    }
                  }

                  // 2. Opponent Costs
                  const opponentPairs = [
                    [p1, p3],
                    [p1, p4],
                    [p2, p3],
                    [p2, p4],
                  ];

                  for (const [u, v] of opponentPairs) {
                    const oCount = opponentCount[getRelationKey(u.id, v.id)] || 0;
                    if (oCount > 0) {
                      totalCost += oCount * 2000 + oCount * oCount * 5000;
                    }

                    // Opponent repeat restriction
                    const minO_u = getMinOpponentCount(u.id, players, opponentCount);
                    if (oCount > minO_u) {
                      totalCost += 50000;
                    }

                    const minO_v = getMinOpponentCount(v.id, players, opponentCount);
                    if (oCount > minO_v) {
                      totalCost += 50000;
                    }
                  }

                  // 3. Play count parity cost
                  const playCounts = [
                    playedCount[p1.id] || 0,
                    playedCount[p2.id] || 0,
                    playedCount[p3.id] || 0,
                    playedCount[p4.id] || 0,
                  ];
                  const maxPlays = Math.max(...playCounts);
                  const minPlays = Math.min(...playCounts);
                  totalCost += (maxPlays - minPlays) * 10;

                  const fairnessScore = 10000000 - totalCost;

                  if (!bestCombination || fairnessScore > bestCombination.score) {
                    bestCombination = {
                      t1: [p1, p2],
                      t2: [p3, p4],
                      score: fairnessScore,
                    };
                  } else if (fairnessScore === bestCombination.score) {
                    const curStr = [p1.id, p2.id, p3.id, p4.id].sort().join('');
                    const bestStr = [
                      bestCombination.t1[0].id,
                      bestCombination.t1[1].id,
                      bestCombination.t2[0].id,
                      bestCombination.t2[1].id,
                    ].sort().join('');
                    if (curStr.localeCompare(bestStr) < 0) {
                      bestCombination = {
                        t1: [p1, p2],
                        t2: [p3, p4],
                        score: fairnessScore,
                      };
                    }
                  }
                }
              }
            }
          }
        }

        if (bestCombination) {
          const { t1, t2 } = bestCombination;
          const p1 = t1[0];
          const p2 = t1[1];
          const p3 = t2[0];
          const p4 = t2[1];

          // Record metrics
          playedCount[p1.id]++;
          playedCount[p2.id]++;
          playedCount[p3.id]++;
          playedCount[p4.id]++;

          incrementPartner(p1.id, p2.id);
          incrementPartner(p3.id, p4.id);

          incrementOpponent(p1.id, p3.id);
          incrementOpponent(p1.id, p4.id);
          incrementOpponent(p2.id, p3.id);
          incrementOpponent(p2.id, p4.id);

          // Remove scheduled players
          remainingActivePlayers = remainingActivePlayers.filter(
            (p) => p.id !== p1.id && p.id !== p2.id && p.id !== p3.id && p.id !== p4.id
          );

          matches.push({
            id: `M-R${r}-C${c}-${Math.random().toString(36).substr(2, 4)}`,
            courtName: `Court ${c}`,
            round: r,
            format: 'Doubles',
            team1: [p1.id, p2.id],
            team2: [p3.id, p4.id],
            status: 'Scheduled',
            duration: config.matchDuration,
            timestamp: `Round ${r} • Lap ${c}`
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Re-evaluate dynamic leaderboard statistics based on matches played
 */
export function recalculateLeaderboard(
  initialPlayers: Player[],
  matches: Match[],
  winPoints: number = 2,
  drawPoints: number = 1
): Player[] {
  // Create deep copy
  const playerMap: Record<string, Player> = {};
  initialPlayers.forEach((p) => {
    playerMap[p.id] = {
      ...p,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      playingTime: 0,
      winRate: 0,
    };
  });

  matches.forEach((m) => {
    if (m.status !== 'Completed') return;
    const s1 = m.score1 ?? 0;
    const s2 = m.score2 ?? 0;

    // Distribute games scores
    const team1P = m.team1;
    const team2P = m.team2;

    team1P.forEach((pid) => {
      if (!playerMap[pid]) return;
      const p = playerMap[pid];
      p.matchesPlayed++;
      p.gamesWon += s1;
      p.gamesLost += s2;
      p.playingTime += m.duration;
    });

    team2P.forEach((pid) => {
      if (!playerMap[pid]) return;
      const p = playerMap[pid];
      p.matchesPlayed++;
      p.gamesWon += s2;
      p.gamesLost += s1;
      p.playingTime += m.duration;
    });

    // Determine Winner
    if (s1 > s2) {
      // Team 1 Wins
      team1P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].matchesWon++;
        playerMap[pid].points += winPoints;
      });
      team2P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].matchesLost++;
      });
    } else if (s2 > s1) {
      // Team 2 Wins
      team2P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].matchesWon++;
        playerMap[pid].points += winPoints;
      });
      team1P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].matchesLost++;
      });
    } else {
      // Draw (points distributed equally if drawPoints > 0)
      team1P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].points += drawPoints;
      });
      team2P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].points += drawPoints;
      });
    }
  });

  // Calculate Win Rates & return sorted array
  return Object.values(playerMap).map((p) => {
    const winRate = p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;
    return {
      ...p,
      winRate,
    };
  }).sort((a, b) => {
    // Sort key:
    // 1. Points descending
    // 2. Games Won diff (Games Won - Games Lost) descending
    // 3. Matches Won descending
    // 4. Name alphabetical
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.gamesWon - a.gamesLost;
    const bDiff = b.gamesWon - b.gamesLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return a.name.localeCompare(b.name);
  });
}
