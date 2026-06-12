import { Player, Match, TournamentConfig, TournamentFormat } from '../types';

/**
 * Normalizes two player IDs into a single sorted string key for tracking relations
 */
const getRelationKey = (id1: string, id2: string): string => {
  return [id1, id2].sort().join(':');
};

/**
 * Returns the minimum partner count for a user across all other players
 */
const getMinPartnerCount = (
  playerId: string,
  allPlayers: Player[],
  partnerCount: Record<string, number>
): number => {
  let minCount = Infinity;
  allPlayers.forEach((other) => {
    if (other.id === playerId) return;
    const key = getRelationKey(playerId, other.id);
    const count = partnerCount[key] || 0;
    if (count < minCount) minCount = count;
  });
  return minCount === Infinity ? 0 : minCount;
};

/**
 * Returns the minimum opponent count for a user across all other players
 */
const getMinOpponentCount = (
  playerId: string,
  allPlayers: Player[],
  opponentCount: Record<string, number>
): number => {
  let minCount = Infinity;
  allPlayers.forEach((other) => {
    if (other.id === playerId) return;
    const key = getRelationKey(playerId, other.id);
    const count = opponentCount[key] || 0;
    if (count < minCount) minCount = count;
  });
  return minCount === Infinity ? 0 : minCount;
};

/**
 * Generates an event schedule based on player list and tournament configuration
 */
export function generateSchedule(
  players: Player[],
  config: TournamentConfig,
  roundsCount: number,
  playerPointsMap?: Record<string, number>
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
    let activePlayersThisRound: Player[] = [];

    const isTeamFormat =
      config.tournamentFormat === 'Team Americano' ||
      config.tournamentFormat === 'Team Mexicano' ||
      (config.tournamentFormat === 'King of the Court' && !!config.partnerMap);

    if (isTeamFormat && config.partnerMap) {
      // Group players into unique pairs
      const duos: [Player, Player][] = [];
      const seen = new Set<string>();

      players.forEach((p) => {
        if (seen.has(p.id)) return;
        const partnerId = config.partnerMap?.[p.id];
        if (partnerId) {
          const partner = players.find((x) => x.id === partnerId);
          if (partner) {
            duos.push([p, partner]);
            seen.add(p.id);
            seen.add(partnerId);
          }
        }
      });

      // Sort duos by min/average played count
      const sortedDuos = duos.sort((a, b) => {
        const playedA = Math.max(playedCount[a[0].id] || 0, playedCount[a[1].id] || 0);
        const playedB = Math.max(playedCount[b[0].id] || 0, playedCount[b[1].id] || 0);
        if (playedA !== playedB) return playedA - playedB;
        return a[0].id.localeCompare(b[0].id);
      });

      // For Doubles we need 2 duos per court, for Singles we need 1 duo per court
      const duosNeeded = config.format === 'Doubles' ? activeCourtsCount * 2 : activeCourtsCount;
      const activeDuos = sortedDuos.slice(0, duosNeeded);
      activePlayersThisRound = activeDuos.flat();
    } else {
      const roundPlayersPool = [...players].sort((a, b) => {
        const pA = playedCount[a.id] || 0;
        const pB = playedCount[b.id] || 0;
        if (pA !== pB) return pA - pB;
        return a.id.localeCompare(b.id);
      });
      activePlayersThisRound = roundPlayersPool.slice(0, activePlayersNeeded);
    }

    // 3. For each court in this round, find the absolute best match using fairness scores
    let remainingActivePlayers = [...activePlayersThisRound];

    // Under standings-based formats, we sort players by points (or ranking) descending
    const isStandingsBased =
      config.tournamentFormat === 'Mexicano' ||
      config.tournamentFormat === 'Team Mexicano' ||
      config.tournamentFormat === 'Super Mexicano' ||
      config.tournamentFormat === 'King of the Court' ||
      config.tournamentFormat === 'Mixicano';

    if (isStandingsBased && playerPointsMap) {
      remainingActivePlayers.sort((a, b) => {
        const pointsA = playerPointsMap[a.id] || 0;
        const pointsB = playerPointsMap[b.id] || 0;
        if (pointsA !== pointsB) return pointsB - pointsA;
        return a.id.localeCompare(b.id);
      });
    }

    for (let c = 1; c <= activeCourtsCount; c++) {
      if (remainingActivePlayers.length < formatSize) break;

      // Restrict search pool to the next exact players for this court in standings-based formats
      const searchPoolSize = isStandingsBased ? formatSize : Math.min(remainingActivePlayers.length, 12);
      const searchPool = remainingActivePlayers.slice(0, searchPoolSize);

      if (config.format === 'Singles') {
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
        let bestCombination: {
          t1: [Player, Player];
          t2: [Player, Player];
          score: number;
        } | null = null;

        const len = searchPool.length;

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

                  // 1. Partner Costs & Restrictions
                  const partnerPairs = [
                    [p1, p2],
                    [p3, p4],
                  ];

                  for (const [u, v] of partnerPairs) {
                    const pCount = partnerCount[getRelationKey(u.id, v.id)] || 0;
                    if (pCount > 0) {
                      totalCost += pCount * 10000 + pCount * pCount * 50000;
                    }

                    // Pre-assigned teammate check for Team formats
                    if (config.partnerMap) {
                      const expectedPartner = config.partnerMap[u.id];
                      if (expectedPartner && expectedPartner !== v.id) {
                        totalCost += 10000000; // massive penalty if not teammate
                      }
                    }

                    // Mixed gender formats check
                    if (config.tournamentFormat === 'Mixed Americano' || config.tournamentFormat === 'Mixicano') {
                      if (u.gender === v.gender) {
                        totalCost += 5000000; // massive penalty for same-gender partner
                      }
                    }

                    const minP_u = getMinPartnerCount(u.id, players, partnerCount);
                    if (pCount > minP_u) {
                      totalCost += 1000000;
                    }

                    const minP_v = getMinPartnerCount(v.id, players, partnerCount);
                    if (pCount > minP_v) {
                      totalCost += 1000000;
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
  drawPoints: number = 1,
  tournamentFormat: TournamentFormat = 'Americano'
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

    // Points allocation based on tournament format
    const isAmericanoPoints =
      tournamentFormat === 'Americano' ||
      tournamentFormat === 'Mexicano' ||
      tournamentFormat === 'Mixicano' ||
      tournamentFormat === 'Mixed Americano' ||
      tournamentFormat === 'Team Americano' ||
      tournamentFormat === 'Team Mexicano' ||
      tournamentFormat === 'Super Mexicano';

    const isKingOfTheCourt = tournamentFormat === 'King of the Court';

    if (isAmericanoPoints) {
      // In Americano/Mexicano, points are equal to games won
      let s1Final = s1;
      let s2Final = s2;
      if (tournamentFormat === 'Super Mexicano' && m.courtName === 'Court 1') {
        // Multiply Court 1 scores by 1.5 in Super Mexicano
        s1Final = Math.round(s1 * 1.5);
        s2Final = Math.round(s2 * 1.5);
      }
      team1P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].points += s1Final;
      });
      team2P.forEach((pid) => {
        if (!playerMap[pid]) return;
        playerMap[pid].points += s2Final;
      });
    } else if (isKingOfTheCourt) {
      // King of the Court
      // Win on Court 1 (King's Court) = 3 pt.
      // Win on lower courts = 1 pt.
      // Draw = split (1.5 on Court 1, 0.5 on others)
      const isCourt1 = m.courtName === 'Court 1';
      if (s1 > s2) {
        team1P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += isCourt1 ? 3 : 1;
        });
      } else if (s2 > s1) {
        team2P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += isCourt1 ? 3 : 1;
        });
      } else {
        team1P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += isCourt1 ? 1.5 : 0.5;
        });
        team2P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += isCourt1 ? 1.5 : 0.5;
        });
      }
    } else {
      // Standard competitive
      if (s1 > s2) {
        team1P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += winPoints;
        });
      } else if (s2 > s1) {
        team2P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += winPoints;
        });
      } else {
        team1P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += drawPoints;
        });
        team2P.forEach((pid) => {
          if (!playerMap[pid]) return;
          playerMap[pid].points += drawPoints;
        });
      }
    }

    // Record wins and losses for statistics
    if (s1 > s2) {
      team1P.forEach((pid) => {
        if (playerMap[pid]) playerMap[pid].matchesWon++;
      });
      team2P.forEach((pid) => {
        if (playerMap[pid]) playerMap[pid].matchesLost++;
      });
    } else if (s2 > s1) {
      team2P.forEach((pid) => {
        if (playerMap[pid]) playerMap[pid].matchesWon++;
      });
      team1P.forEach((pid) => {
        if (playerMap[pid]) playerMap[pid].matchesLost++;
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
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.gamesWon - a.gamesLost;
    const bDiff = b.gamesWon - b.gamesLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return a.name.localeCompare(b.name);
  });
}
