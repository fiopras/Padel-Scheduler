import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, RotateCcw, Calendar, Swords, Plus, Minus, Search, Landmark } from 'lucide-react';
import { Match, Player } from '../types';

interface MatchListProps {
  matches: Match[];
  players: Player[];
  onUpdateScore: (matchId: string, score1: number, score2: number) => void;
  onSetStatus: (matchId: string, status: 'Scheduled' | 'In Progress' | 'Completed') => void;
  onResetMatch: (matchId: string) => void;
  scoringType?: 'BestOf' | 'RaceTo';
  scoringValue?: number;
}

export default function MatchList({
  matches,
  players,
  onUpdateScore,
  onSetStatus,
  onResetMatch,
  scoringType = 'BestOf',
  scoringValue = 4
}: MatchListProps) {
  const [selectedRound, setSelectedRound] = React.useState<number | 'All'>('All');
  const [courtFilter, setCourtFilter] = React.useState<string>('All');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [playerSearch, setPlayerSearch] = React.useState<string>('');

  // Player Map lookup
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Get dynamic lists of rounds and courts
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const courts = Array.from(new Set(matches.map((m) => m.courtName))).sort();

  // Filter logic
  const filteredMatches = matches.filter((m) => {
    const matchesRound = selectedRound === 'All' || m.round === selectedRound;
    const matchesCourt = courtFilter === 'All' || m.courtName === courtFilter;
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;

    let matchesPlayer = true;
    if (playerSearch.trim()) {
      const query = playerSearch.toLowerCase().trim();
      const t1Names = m.team1.map((id) => playerMap.get(id)?.name?.toLowerCase() || '');
      const t2Names = m.team2.map((id) => playerMap.get(id)?.name?.toLowerCase() || '');
      matchesPlayer =
        t1Names.some((name) => name.includes(query)) ||
        t2Names.some((name) => name.includes(query));
    }

    return matchesRound && matchesCourt && matchesStatus && matchesPlayer;
  });

  return (
    <div id="match-list" className="space-y-6">
      {/* 1. Header Filter Controls */}
      <div className="bg-[#121B2E]/40 p-5 rounded-3xl border border-slate-800/80 space-y-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-tight">
              <Calendar className="w-5 h-5 text-teal-400" />
              Sirkuit Jadwal Lapangan
            </h3>
            <p className="text-xs text-slate-450 mt-0.5">Kelola skor & status pertandingan secara real-time.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Player search inside matches */}
            <div className="relative">
              <input
                id="search-player-match"
                type="text"
                placeholder="Cari nama pemain..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-44 bg-slate-950/80 border border-slate-800 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-605 focus:outline-none transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* Court filter */}
            <select
              id="filter-court-match"
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 focus:border-teal-400 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all"
            >
              <option value="All">Semua Court</option>
              {courts.map((court) => (
                <option key={court} value={court}>
                  {court}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              id="filter-status-match"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 focus:border-teal-400 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all"
            >
              <option value="All">Semua Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Round selection buttons */}
        {rounds.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-t border-slate-800/40 pt-4">
            <button
              id="btn-round-all"
              onClick={() => setSelectedRound('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 font-display tracking-tight hover:-translate-y-0.5 active:translate-y-0 ${
                selectedRound === 'All'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 shadow-lg shadow-teal-500/10'
                  : 'bg-slate-950/85 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Semua Round
            </button>
            {rounds.map((round) => (
              <button
                key={round}
                id={`btn-round-${round}`}
                onClick={() => setSelectedRound(round)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 font-display tracking-tight hover:-translate-y-0.5 active:translate-y-0 ${
                  selectedRound === round
                    ? 'bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 shadow-lg shadow-teal-500/10'
                    : 'bg-slate-950/85 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Round {round}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Matches Arena view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredMatches.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-500 text-xs font-medium bg-[#121B2E]/20 rounded-3xl border border-slate-800/40 border-dashed">
            Tidak ada pertandingan tercatat dalam filter ini.
          </div>
        ) : (
          filteredMatches.map((m) => {
            const team1P = m.team1.map((id) => playerMap.get(id));
            const team2P = m.team2.map((id) => playerMap.get(id));

            return (
              <div
                key={m.id}
                id={`match-card-${m.id}`}
                className={`relative flex flex-col justify-between p-5 rounded-3xl border transition-all duration-300 bg-[#121B2E]/30 relative overflow-hidden ${
                  m.status === 'Completed'
                    ? 'border-indigo-500/15 bg-indigo-950/5'
                    : m.status === 'In Progress'
                    ? 'border-teal-400/40 bg-teal-950/10 shadow-lg shadow-teal-500/5'
                    : 'border-slate-800/80 hover:border-slate-700 hover:bg-[#121B2E]/40'
                }`}
              >
                {/* Visual Ambient line for playing game */}
                {m.status === 'In Progress' && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-teal-500 via-teal-350 to-teal-500 animate-pulse" />
                )}

                {/* Upper parameters bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest bg-slate-900/80 border border-slate-800 text-slate-350 flex items-center gap-1 font-display">
                      <Landmark className="w-2.5 h-2.5 text-teal-400" />
                      {m.courtName}
                    </span>
                    <span className="text-[10px] text-slate-450 font-bold font-mono bg-slate-900/50 px-2 py-0.5 rounded-lg">
                      ROUND {m.round}
                    </span>
                    <span className="text-[9px] text-amber-450 font-extrabold tracking-wider bg-amber-500/10 border border-amber-500/10 px-2 py-0.5 rounded-lg uppercase font-display">
                      BO4
                    </span>
                  </div>

                  {/* Status Indicator pill */}
                  <div>
                    {m.status === 'Completed' ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black text-indigo-400 bg-indigo-950/40 border border-indigo-400/20 uppercase tracking-widest font-display">
                        Completed
                      </span>
                    ) : m.status === 'In Progress' ? (
                      <span className="relative flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                        <span className="px-2 py-0.5 text-[9px] font-black text-teal-400 bg-teal-950/45 border border-teal-400/30 uppercase tracking-widest font-display">
                          Playing
                        </span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black text-slate-400 bg-[#0c1221] border border-slate-800 uppercase tracking-widest font-display">
                        Scheduled
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Teams & Scores Grid */}
                <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-2 items-center my-3 relative">
                  {/* Team 1 Players Names */}
                  <div className="text-center sm:text-right pr-0 sm:pr-2 sm:col-span-4 w-full min-w-0">
                    {team1P.map((p, idx) => (
                      <div key={idx} className="text-xs font-semibold text-white truncate px-1" title={p?.name}>
                        {p?.name || 'N/A'}
                      </div>
                    ))}
                    <div className="text-[9px] text-[#A0AEC0] font-bold mt-1 font-display uppercase tracking-wider">TEAM 1</div>
                  </div>

                  {/* Versus & Score Display */}
                  <div className="w-full sm:col-span-4 flex items-center justify-center gap-2 bg-[#0c1221] py-3 rounded-2xl border border-slate-850 shadow-inner">
                    {m.status === 'Completed' ? (
                      <>
                        <span className={`text-xl font-black font-mono leading-none ${ (m.score1 ?? 0) > (m.score2 ?? 0) ? 'text-teal-400' : 'text-slate-500' }`}>
                          {m.score1 ?? 0}
                        </span>
                        <span className="text-slate-700 text-[9px] font-bold font-display uppercase tracking-widest">VS</span>
                        <span className={`text-xl font-black font-mono leading-none ${ (m.score2 ?? 0) > (m.score1 ?? 0) ? 'text-teal-400' : 'text-slate-500' }`}>
                          {m.score2 ?? 0}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-bold font-mono text-slate-500 leading-none">
                          {m.score1 ?? '-'}
                        </span>
                        <span className="text-slate-700 text-[8px] font-bold font-display">VS</span>
                        <span className="text-base font-bold font-mono text-slate-500 leading-none">
                          {m.score2 ?? '-'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Team 2 Players Names */}
                  <div className="text-center sm:text-left pl-0 sm:pl-2 sm:col-span-4 w-full min-w-0">
                    {team2P.map((p, idx) => (
                      <div key={idx} className="text-xs font-semibold text-white truncate px-1" title={p?.name}>
                        {p?.name || 'N/A'}
                      </div>
                    ))}
                    <div className="text-[9px] text-[#A0AEC0] font-bold mt-1 font-display uppercase tracking-wider font-sans">TEAM 2</div>
                  </div>
                </div>

                {/* Score adjustment & status controls */}
                <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full animate-fade-in">
                  {m.status !== 'Completed' ? (
                    (() => {
                      const totalSets = (m.score1 ?? 0) + (m.score2 ?? 0);
                      const isBestOf = scoringType === 'BestOf';
                      
                      const t1PlusDisabled = false;
                      const t2PlusDisabled = false;

                      const sumLabel = isBestOf 
                        ? `${totalSets}/${scoringValue} Set` 
                        : `${m.score1 ?? 0} - ${m.score2 ?? 0} Games`;

                      const infoTitle = isBestOf 
                        ? `Best of ${scoringValue} (Maksimal total ${scoringValue} set)` 
                        : `Race to ${scoringValue}`;

                      return (
                        <>
                          {/* Plus/minus buttons */}
                          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                            {/* Team 1 score adjusters */}
                            <div className="flex items-center gap-1.5 bg-slate-950 px-1.5 py-0.5 rounded-xl border border-slate-800">
                              <button
                                id={`btn-t1score-dec-${m.id}`}
                                onClick={() => onUpdateScore(m.id, Math.max(0, (m.score1 ?? 0) - 1), m.score2 ?? 0)}
                                className="text-slate-500 hover:text-white p-1 hover:bg-[#121B2E] rounded-md transition-all active:scale-90 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-slate-200 font-mono w-4 text-center">
                                {m.score1 ?? 0}
                              </span>
                              <button
                                id={`btn-t1score-inc-${m.id}`}
                                disabled={t1PlusDisabled}
                                onClick={() => onUpdateScore(m.id, (m.score1 ?? 0) + 1, m.score2 ?? 0)}
                                className={`p-1 rounded-md transition-all ${
                                  t1PlusDisabled
                                    ? 'text-slate-700 cursor-not-allowed opacity-45'
                                    : 'text-slate-500 hover:text-white hover:bg-[#121B2E] active:scale-90 cursor-pointer'
                                }`}
                                title={t1PlusDisabled ? infoTitle : "Tambah skor Team 1"}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="text-slate-700 text-xs font-bold font-mono hidden sm:inline">•</span>

                            {/* Team 2 score adjusters */}
                            <div className="flex items-center gap-1.5 bg-slate-950 px-1.5 py-0.5 rounded-xl border border-slate-800">
                              <button
                                id={`btn-t2score-dec-${m.id}`}
                                onClick={() => onUpdateScore(m.id, m.score1 ?? 0, Math.max(0, (m.score2 ?? 0) - 1))}
                                className="text-slate-500 hover:text-white p-1 hover:bg-[#121B2E] rounded-md transition-all active:scale-90 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-slate-200 font-mono w-4 text-center">
                                {m.score2 ?? 0}
                              </span>
                              <button
                                id={`btn-t2score-inc-${m.id}`}
                                disabled={t2PlusDisabled}
                                onClick={() => onUpdateScore(m.id, m.score1 ?? 0, (m.score2 ?? 0) + 1)}
                                className={`p-1 rounded-md transition-all ${
                                  t2PlusDisabled
                                    ? 'text-slate-700 cursor-not-allowed opacity-45'
                                    : 'text-slate-500 hover:text-white hover:bg-[#121B2E] active:scale-90 cursor-pointer'
                                }`}
                                title={t2PlusDisabled ? infoTitle : "Tambah skor Team 2"}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Set Count Indicator status */}
                            <span className="text-[10px] font-mono text-slate-400 font-medium">
                              ({sumLabel} • {scoringType === 'BestOf' ? 'Best of' : 'Race to'} {scoringValue})
                            </span>
                          </div>

                          {/* State status switches */}
                          <div className="flex items-center justify-center sm:justify-end gap-1 w-full sm:w-auto">
                            {m.status === 'Scheduled' ? (
                              <button
                                id={`btn-start-${m.id}`}
                                onClick={() => onSetStatus(m.id, 'In Progress')}
                                className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-extrabold bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 active:scale-95 transition-all rounded-xl border border-teal-500/20 uppercase tracking-widest font-display cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-teal-400" /> Start
                              </button>
                            ) : (
                              <button
                                id={`btn-complete-${m.id}`}
                                onClick={() => onSetStatus(m.id, 'Completed')}
                                className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all rounded-xl border border-emerald-500/20 uppercase tracking-widest font-display cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Complete
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      {/* Fully complete score locks, offer quick score resets */}
                      <div className="text-[10px] text-slate-450 font-bold font-sans text-center sm:text-left">
                        Selesai • Skor hasil disimpan.
                      </div>
                      <button
                        id={`btn-reset-${m.id}`}
                        onClick={() => onResetMatch(m.id)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-350 bg-[#0c1221] hover:text-white hover:bg-[#121b2e] transition-all border border-slate-800 font-display active:scale-95 uppercase tracking-wider cursor-pointer"
                        title="Buka kembali pertandingan"
                      >
                        <RotateCcw className="w-2.5 h-2.5 text-slate-450" /> Buka Laga
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
