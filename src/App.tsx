import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Calendar,
  Users,
  Trophy,
  BarChart3,
  Dribbble,
  Download,
  Flame,
  Settings,
  X,
  Play,
  RotateCcw,
  Zap,
  Info,
  Coins
} from 'lucide-react';
import { Player, Match, TournamentConfig, GenderType, SkillLevelType } from './types';
import { generateSchedule, recalculateLeaderboard } from './utils/scheduler';
import {
  parsePlayersFromExcel,
  exportScheduleToExcel,
  exportLeaderboardToExcel
} from './utils/excel';

// Component imports
import DashboardStats from './components/DashboardStats';
import LeaderboardPodium from './components/LeaderboardPodium';
import PlayerManager from './components/PlayerManager';
import AnalyticsCharts from './components/AnalyticsCharts';
import MatchList from './components/MatchList';
import CourtFeeCalculator from './components/CourtFeeCalculator';

// Seed Initial Data
const SEED_PLAYERS: Player[] = [
  { id: 'usr-1', name: 'Aziz', gender: 'Laki-laki', skillLevel: 'Advanced', matchesPlayed: 2, matchesWon: 2, matchesLost: 0, points: 4, gamesWon: 42, gamesLost: 31, playingTime: 40, winRate: 100 },
  { id: 'usr-2', name: 'Jay', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 2, matchesWon: 0, matchesLost: 2, points: 0, gamesWon: 28, gamesLost: 42, playingTime: 40, winRate: 0 },
  { id: 'usr-3', name: 'Ibra', gender: 'Laki-laki', skillLevel: 'Advanced', matchesPlayed: 2, matchesWon: 1, matchesLost: 1, points: 2, gamesWon: 38, gamesLost: 33, playingTime: 40, winRate: 50 },
  { id: 'usr-4', name: 'Bes', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 2, matchesWon: 1, matchesLost: 1, points: 2, gamesWon: 35, gamesLost: 36, playingTime: 40, winRate: 50 },
  { id: 'usr-5', name: 'Mas Rizal', gender: 'Laki-laki', skillLevel: 'Advanced', matchesPlayed: 2, matchesWon: 2, matchesLost: 0, points: 4, gamesWon: 42, gamesLost: 27, playingTime: 40, winRate: 100 },
  { id: 'usr-6', name: 'Fio', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 2, matchesWon: 0, matchesLost: 2, points: 0, gamesWon: 29, gamesLost: 42, playingTime: 40, winRate: 0 },
  { id: 'usr-7', name: 'Wisnu', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 2, matchesWon: 1, matchesLost: 1, points: 2, gamesWon: 32, gamesLost: 36, playingTime: 40, winRate: 50 },
  { id: 'usr-8', name: 'Samy', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 2, matchesWon: 1, matchesLost: 1, points: 2, gamesWon: 33, gamesLost: 31, playingTime: 40, winRate: 50 },
  { id: 'usr-9', name: 'Adi', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, gamesWon: 0, gamesLost: 0, playingTime: 0, winRate: 0 },
  { id: 'usr-10', name: 'Haikal', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, gamesWon: 0, gamesLost: 0, playingTime: 0, winRate: 0 },
  { id: 'usr-11', name: 'Agung', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, gamesWon: 0, gamesLost: 0, playingTime: 0, winRate: 0 },
  { id: 'usr-12', name: 'Firman', gender: 'Laki-laki', skillLevel: 'Advanced', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, gamesWon: 0, gamesLost: 0, playingTime: 0, winRate: 0 },
  { id: 'usr-13', name: 'Adhe', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, gamesWon: 0, gamesLost: 0, playingTime: 0, winRate: 0 },
  { id: 'usr-14', name: 'Rama', gender: 'Laki-laki', skillLevel: 'Intermediate', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, gamesWon: 0, gamesLost: 0, playingTime: 0, winRate: 0 },
];

const SEED_MATCHES: Match[] = [
  {
    id: 'm-seed-1',
    courtName: 'Court 1',
    round: 1,
    format: 'Doubles',
    team1: ['usr-1', 'usr-4'],
    team2: ['usr-3', 'usr-6'],
    score1: 3,
    score2: 1,
    status: 'Completed',
    duration: 20,
    timestamp: 'Round 1 • Lap 1',
  },
  {
    id: 'm-seed-2',
    courtName: 'Court 2',
    round: 1,
    format: 'Doubles',
    team1: ['usr-5', 'usr-8'],
    team2: ['usr-7', 'usr-2'],
    score1: 2,
    score2: 2,
    status: 'Completed',
    duration: 20,
    timestamp: 'Round 1 • Lap 2',
  },
  {
    id: 'm-seed-3',
    courtName: 'Court 1',
    round: 2,
    format: 'Doubles',
    team1: ['usr-1', 'usr-8'],
    team2: ['usr-3', 'usr-2'],
    score1: 4,
    score2: 0,
    status: 'Completed',
    duration: 20,
    timestamp: 'Round 2 • Lap 1',
  },
  {
    id: 'm-seed-4',
    courtName: 'Court 2',
    round: 2,
    format: 'Doubles',
    team1: ['usr-5', 'usr-7'],
    team2: ['usr-4', 'usr-6'],
    score1: 3,
    score2: 1,
    status: 'Completed',
    duration: 20,
    timestamp: 'Round 2 • Lap 2',
  },
  {
    id: 'm-seed-5',
    courtName: 'Court 1',
    round: 3,
    format: 'Doubles',
    team1: ['usr-1', 'usr-3'],
    team2: ['usr-5', 'usr-2'],
    status: 'Scheduled',
    duration: 20,
    timestamp: 'Round 3 • Lap 1',
  },
  {
    id: 'm-seed-6',
    courtName: 'Court 2',
    round: 3,
    format: 'Doubles',
    team1: ['usr-4', 'usr-8'],
    team2: ['usr-7', 'usr-6'],
    status: 'Scheduled',
    duration: 20,
    timestamp: 'Round 3 • Lap 2',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'players' | 'matches' | 'leaderboard' | 'patungan'>('dashboard');

  // Application database state
  const [players, setPlayers] = React.useState<Player[]>(SEED_PLAYERS);
  const [matches, setMatches] = React.useState<Match[]>(SEED_MATCHES);

  // Scheduler Config State
  const [config, setConfig] = React.useState<TournamentConfig>({
    courtCount: 2,
    matchDuration: 20,
    format: 'Doubles',
    winPoints: 2,
    drawPoints: 1,
  });
  const [roundsCount, setRoundsCount] = React.useState<number>(3);

  // UI Notification alert
  const [notification, setNotification] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Recalculate leaderboard whenever matches status/scores change
  const currentLeaderboard = React.useMemo(() => {
    return recalculateLeaderboard(players, matches, config.winPoints, config.drawPoints);
  }, [players, matches, config.winPoints, config.drawPoints]);

  // Handle Drag-and-Drop Excel uploads
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const parsed = await parsePlayersFromExcel(files[0]);
      if (parsed.length === 0) {
        showNotification('File Excel kosong atau kolom tidak dikenali.', 'error');
        return;
      }

      // Convert parsed simple profiles to Full Players objects
      const newPlayers: Player[] = parsed.map((p, idx) => ({
        id: `usr-excel-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: p.name || 'Anonymous',
        gender: p.gender || 'Laki-laki',
        skillLevel: p.skillLevel || 'Intermediate',
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        playingTime: 0,
        points: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
      }));

      // Set players roster
      setPlayers(newPlayers);
      // Reset matches because new players are loaded
      setMatches([]);
      showNotification(`Berhasil mengimpor ${newPlayers.length} atlet dari Excel!`);
    } catch (err) {
      showNotification('Gagal membaca file Excel. Pastikan format sesuai.', 'error');
      console.error(err);
    }
  };

  // Generate new schedule matches
  const handleGenerateMatches = () => {
    if (players.length < 2) {
      showNotification('Dibutuhkan minimal 2 atlet untuk menjadwalkan tanding.', 'error');
      return;
    }
    if (config.format === 'Doubles' && players.length < 4) {
      showNotification('Dibutuhkan minimal 4 atlet untuk menjadwalkan format ganda (Doubles).', 'error');
      return;
    }

    const newMatches = generateSchedule(players, config, roundsCount);
    if (newMatches.length === 0) {
      showNotification('Algoritma gagal merumuskan kecocokan roster.', 'error');
      return;
    }

    setMatches(newMatches);
    setActiveTab('matches');
    showNotification(`Jadwal baru berhasil dibuat! ${roundsCount} Round, total ${newMatches.length} Match.`);
  };

  // Manual player addition
  const handleAddPlayer = (newP: { name: string; gender: GenderType; skillLevel: SkillLevelType }) => {
    const player: Player = {
      id: `usr-${Date.now()}`,
      name: newP.name,
      gender: newP.gender,
      skillLevel: newP.skillLevel,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      playingTime: 0,
      winRate: 0,
    };

    setPlayers((prev) => [...prev, player]);
    showNotification(`${newP.name} berhasil ditambahkan ke Roster.`);
  };

  // Drag & drop sorting callback
  const handleReorderPlayers = (reordered: Player[]) => {
    setPlayers(reordered);
    showNotification('Posisi seeding atlet diatur ulang.');
  };

  // Remove player
  const handleRemovePlayer = (id: string) => {
    const deletedName = players.find((p) => p.id === id)?.name || 'Atlet';
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    // Filter matches that involve this deleted player to keep reference integrity
    setMatches((prev) => prev.filter((m) => !m.team1.includes(id) && !m.team2.includes(id)));
    showNotification(`${deletedName} berhasil dihapus.`);
  };

  // Update score of a match
  const handleUpdateScore = (matchId: string, s1: number, s2: number) => {
    if (s1 + s2 > 4 || s1 < 0 || s2 < 0) {
      return; // BO4 constraint: cannot be more than 4 sets total
    }
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, score1: s1, score2: s2 } : m
      )
    );
  };

  // Update status of a match (Completed/In Progress)
  const handleSetStatus = (matchId: string, status: 'Scheduled' | 'In Progress' | 'Completed') => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;

        // If completing, ensure scores are initialized to something if they were undefined
        const nextScore1 = status === 'Completed' && m.score1 === undefined ? 0 : m.score1;
        const nextScore2 = status === 'Completed' && m.score2 === undefined ? 0 : m.score2;

        return {
          ...m,
          status,
          score1: nextScore1,
          score2: nextScore2,
        };
      })
    );

    if (status === 'Completed') {
      showNotification('Skor tersimpan. Klasemen Leaderboard otomatis diupdate!');
    }
  };

  // Quick reset a completed match
  const handleResetMatch = (matchId: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              status: 'Scheduled',
              score1: undefined,
              score2: undefined,
            }
          : m
      )
    );
    showNotification('Pertandingan dibuka kembali. Skor direset.', 'success');
  };

  // Exporters
  const handleExportSchedule = () => {
    if (matches.length === 0) {
      showNotification('Belum ada jadwal pertandingan untuk di-export.', 'error');
      return;
    }
    exportScheduleToExcel(matches, players);
    showNotification('Hasil Jadwal Pertandingan berhasil di-export ke Excel!');
  };

  const handleExportLeaderboard = () => {
    exportLeaderboardToExcel(currentLeaderboard);
    showNotification('Klasemen Leaderboard berhasil di-export ke Excel!');
  };

  const handleClearAll = () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh data sirkuit atlet dan jadwal?')) {
      setPlayers([]);
      setMatches([]);
      showNotification('Database dibersihkan.', 'success');
    }
  };

  return (
    <div id="main-sports-wrapper" className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-teal-500 selection:text-slate-950 relative overflow-hidden pb-12">
      {/* Visual Ambient Elixir Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Banner Area */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 sm:py-0 sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-450 to-teal-500 p-2.5 rounded-xl text-slate-950 shadow-md ring-4 ring-teal-500/10 shrink-0">
              <Dribbble className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 leading-none font-display">
                COURT MASTER <span className="text-[9px] bg-teal-500/10 text-teal-400 py-1 px-1.5 rounded font-black border border-teal-550/20 tracking-wider">PRO</span>
              </h1>
              <p className="text-[9px] text-[#94A3B8] font-bold tracking-widest uppercase mt-1.5 font-mono">Excel Sports Scheduler & Analyst</p>
            </div>
          </div>

          {/* Quick Excel Action */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="excel-uploader"
              className="px-4 py-2 bg-[#121B2E]/60 hover:bg-[#121B2E] text-xs font-bold text-slate-200 hover:text-white rounded-xl border border-slate-800 shadow-md cursor-pointer transition-all flex items-center gap-2 font-display uppercase tracking-wider w-full justify-center sm:w-auto"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400 font-bold" />
              Upload Atlet Excel
              <input
                id="excel-uploader"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Core Body Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Floating System Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-50 shadow-2xl"
            >
              <div
                className={`flex items-center gap-2.5 p-4 rounded-2xl border backdrop-blur-md ${
                  notification.type === 'error'
                    ? 'bg-rose-950/95 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-rose-400' : 'bg-emerald-450 animate-pulse'}`} />
                <span className="text-xs font-semibold">{notification.text}</span>
                <button
                  onClick={() => setNotification(null)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-450 hover:text-white ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Scheduler Configurations Arena Panel */}
        <section className="bg-[#121B2E]/40 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />
          
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
            {/* Left Description Box */}
            <div className="space-y-1.5 p-3 rounded-2xl border border-slate-850 bg-slate-950/20 xl:col-span-4 self-stretch flex flex-col justify-center">
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                <Settings className="w-4 h-4 text-amber-500 shrink-0" />
                Parameter Algoritma Penjadwalan
              </h2>
              <p className="text-[11px] text-[#A0AEC0] leading-relaxed">
                Kustomisasi parameter tanding Anda. Algoritma cerdas kami otomatis merumuskan rotasi partner laga ganda agar adil, interaktif, dan seimbang sepanjang event!
              </p>
            </div>

            {/* Middle Grid of Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:col-span-6 w-full">
              {/* Type Format */}
              <div>
                <label htmlFor="config-format" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                  Format Laga
                </label>
                <select
                  id="config-format"
                  value={config.format}
                  onChange={(e) => setConfig({ ...config, format: e.target.value as 'Singles' | 'Doubles' })}
                  className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                >
                  <option value="Doubles">Doubles (2v2)</option>
                  <option value="Singles">Singles (1v1)</option>
                </select>
              </div>

              {/* Court Count */}
              <div>
                <label htmlFor="config-courtCount" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                  Jumlah Court
                </label>
                <input
                  id="config-courtCount"
                  type="number"
                  min={1}
                  max={10}
                  value={config.courtCount}
                  onChange={(e) => setConfig({ ...config, courtCount: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 font-mono"
                />
              </div>

              {/* Rounds count */}
              <div>
                <label htmlFor="config-rounds" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                  Putaran (Rounds)
                </label>
                <input
                  id="config-rounds"
                  type="number"
                  min={1}
                  max={15}
                  value={roundsCount}
                  onChange={(e) => setRoundsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 font-mono"
                />
              </div>
            </div>

            {/* Generate Action */}
            <div className="xl:col-span-2 w-full flex items-end xl:self-end">
              <button
                id="btn-re-generate"
                onClick={handleGenerateMatches}
                className="w-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-[#0F172A] text-xs font-black py-3 px-5 rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-display uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-[#0F172A]" />
                Generate Jadwal
              </button>
            </div>
          </div>
        </section>

        {/* 2. Primary Tabs bar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          {/* Tabs Navigation */}
          <div className="flex flex-nowrap lg:flex-wrap items-center gap-1 bg-[#090D16] border border-slate-900 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto scrollbar-none shrink-0 pb-2 lg:pb-1.5">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
              Dashboard & Analitik
            </button>

            <button
              id="tab-btn-players"
              onClick={() => setActiveTab('players')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'players'
                  ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-400" />
              Kelola Players ({players.length})
            </button>

            <button
              id="tab-btn-matches"
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'matches'
                  ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              Jadwal Arena ({matches.length})
            </button>

            <button
              id="tab-btn-leaderboard"
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-teal-400" />
              Klasemen Rank
            </button>

            <button
              id="tab-btn-patungan"
              onClick={() => setActiveTab('patungan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'patungan'
                  ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-teal-400" />
              Patungan Lapangan
            </button>
          </div>

          {/* Quick Excel Downloads */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Split Individual Download Leaders */}
            {activeTab === 'leaderboard' && (
              <button
                id="btn-export-leaders-direct"
                onClick={handleExportLeaderboard}
                className="px-3.5 py-2 text-xs font-extrabold bg-indigo-950/40 hover:bg-indigo-900 hover:text-white border border-indigo-505/20 text-indigo-400 rounded-xl transition-all flex items-center gap-1.5 font-display uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" />
                Export Leaderboard
              </button>
            )}

            {/* Split Individual Download Schedule */}
            {activeTab === 'matches' && (
              <button
                id="btn-export-sched-direct"
                onClick={handleExportSchedule}
                className="px-3.5 py-2 text-xs font-extrabold bg-indigo-950/40 hover:bg-indigo-900 hover:text-white border border-indigo-505/20 text-indigo-400 rounded-xl transition-all flex items-center gap-1.5 font-display uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" />
                Export Jadwal
              </button>
            )}

            {/* Clear Database Utility */}
            <button
              id="btn-clear-db"
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-semibold text-slate-550 hover:text-rose-450 bg-[#0c1221] hover:bg-slate-950 rounded-xl transition-all border border-slate-900 hover:border-rose-950 cursor-pointer"
              title="Clear active state database"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* 3. Render Dashboard Tabs Content */}
        <div id="active-tab-panel">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Overarching general cards metrics */}
              <DashboardStats
                players={players}
                matches={matches}
                courtCount={config.courtCount}
              />

              {/* Informational Alerts */}
              {matches.length === 0 && (
                <div id="empty-state-notice" className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20 text-yellow-250 flex items-start gap-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">Roster Kosong / Belum Dijadwal</p>
                    <p>
                      Silakan ke tab <b>Kelola Players</b> untuk memasukkan atlet buatan atau klik <b>Upload Atlet Excel</b> di pojok kanan atas untuk memasukkan dari berkas offline. Jika sudah, jalankan <b>Generate Jadwal</b> di panel atas!
                    </p>
                  </div>
                </div>
              )}

              {/* Analytics graphics visualizations */}
              <AnalyticsCharts players={currentLeaderboard} matches={matches} />
            </div>
          )}

          {activeTab === 'players' && (
            <PlayerManager
              players={players}
              onAddPlayer={handleAddPlayer}
              onRemovePlayer={handleRemovePlayer}
              onReorderPlayers={handleReorderPlayers}
              onExcelUpload={handleExcelUpload}
            />
          )}

          {activeTab === 'matches' && (
            <MatchList
              matches={matches}
              players={players}
              onUpdateScore={handleUpdateScore}
              onSetStatus={handleSetStatus}
              onResetMatch={handleResetMatch}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardPodium leaderboard={currentLeaderboard} />
          )}

          {activeTab === 'patungan' && (
            <CourtFeeCalculator players={players} />
          )}
        </div>
      </main>
    </div>
  );
}
