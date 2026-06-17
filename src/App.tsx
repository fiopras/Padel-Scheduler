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
  Coins,
  Compass
} from 'lucide-react';
import { Player, Match, TournamentConfig, GenderType, SkillLevelType, TournamentFormat, ScoringType, PadelEvent } from './types';
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
import EventManager from './components/EventManager';
import UserFlowWizard from './components/UserFlowWizard';

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
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'events' | 'players' | 'matches' | 'leaderboard' | 'patungan'>('dashboard');

  // Application database state
  const [players, setPlayers] = React.useState<Player[]>(SEED_PLAYERS);
  const [matches, setMatches] = React.useState<Match[]>(SEED_MATCHES);

  // Reference to track currently loaded/synchronized event to prevent race-condition wipes
  const loadedEventIdRef = React.useRef<string | null>(null);

  // Scheduler Config State
  const [config, setConfig] = React.useState<TournamentConfig>({
    courtCount: 2,
    matchDuration: 20,
    format: 'Doubles',
    winPoints: 2,
    drawPoints: 1,
    tournamentFormat: 'Americano',
    scoringType: 'BestOf',
    scoringValue: 4
  });
  const [roundsCount, setRoundsCount] = React.useState<number>(3);

  // Event History and active event
  const [events, setEvents] = React.useState<PadelEvent[]>(() => {
    try {
      const saved = localStorage.getItem('court_master_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse events from localStorage:", e);
    }
    return [];
  });
  const [activeEventId, setActiveEventId] = React.useState<string | null>(() => {
    return localStorage.getItem('court_master_active_event_id') || null;
  });

  // UI Notification alert
  const [notification, setNotification] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Seed initial events if none exist
  React.useEffect(() => {
    if (events.length === 0) {
      const defaultEvent: PadelEvent = {
        id: 'evt-seed',
        name: 'Friday Night Padel (Contoh)',
        createdAt: new Date().toISOString(),
        format: 'Americano',
        players: SEED_PLAYERS,
        matches: SEED_MATCHES,
        config: {
          courtCount: 2,
          matchDuration: 20,
          format: 'Doubles',
          winPoints: 2,
          drawPoints: 1,
          scoringType: 'BestOf',
          scoringValue: 4,
          roundsCount: 3,
          tournamentFormat: 'Americano'
        }
      };
      setEvents([defaultEvent]);
      setActiveEventId('evt-seed');
      localStorage.setItem('court_master_events', JSON.stringify([defaultEvent]));
      localStorage.setItem('court_master_active_event_id', 'evt-seed');
    }
  }, []);

  // Save events to localStorage whenever they change
  React.useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('court_master_events', JSON.stringify(events));
    }
  }, [events]);

  React.useEffect(() => {
    if (activeEventId) {
      localStorage.setItem('court_master_active_event_id', activeEventId);
    } else {
      localStorage.removeItem('court_master_active_event_id');
    }
  }, [activeEventId]);

  // Load active event data into states when activeEventId changes
  React.useEffect(() => {
    if (!activeEventId) return;
    const current = events.find(e => e.id === activeEventId);
    if (current) {
      // Step 1: Set our lock reference to current active event ID BEFORE updating state
      loadedEventIdRef.current = activeEventId;
      setPlayers(current.players);
      setMatches(current.matches);
      setConfig({
        courtCount: current.config.courtCount,
        matchDuration: current.config.matchDuration,
        format: current.config.format,
        winPoints: current.config.winPoints,
        drawPoints: current.config.drawPoints,
        tournamentFormat: current.format,
        scoringType: current.config.scoringType || 'BestOf',
        scoringValue: current.config.scoringValue || 4,
        partnerMap: current.partnerMap
      });
      setRoundsCount(current.config.roundsCount || 3);
    }
  }, [activeEventId]);

  // Sync state changes back to events list
  React.useEffect(() => {
    if (!activeEventId) return;
    // VERY IMPORTANT: Prevent syncing back stale players/matches from the previous event
    // while the activeEventId loading transition is currently running!
    if (loadedEventIdRef.current !== activeEventId) {
      return;
    }

    setEvents(prev => prev.map(e => {
      if (e.id === activeEventId) {
        return {
          ...e,
          players,
          matches,
          config: {
            ...e.config,
            courtCount: config.courtCount,
            matchDuration: config.matchDuration,
            format: config.format,
            winPoints: config.winPoints,
            drawPoints: config.drawPoints,
            scoringType: config.scoringType || 'BestOf',
            scoringValue: config.scoringValue || 4,
            roundsCount: roundsCount
          },
          format: config.tournamentFormat || 'Americano',
          partnerMap: config.partnerMap
        };
      }
      return e;
    }));
  }, [players, matches, config, roundsCount, activeEventId]);

  // Recalculate leaderboard whenever matches status/scores change
  const currentLeaderboard = React.useMemo(() => {
    return recalculateLeaderboard(players, matches, config.winPoints, config.drawPoints, config.tournamentFormat || 'Americano');
  }, [players, matches, config.winPoints, config.drawPoints, config.tournamentFormat]);

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

    // Build points map
    const playerPointsMap: Record<string, number> = {};
    players.forEach(p => {
      playerPointsMap[p.id] = p.points || 0;
    });

    // Handle Team formats auto-partner assignment dynamically from current row order
    let finalConfig = { ...config };
    const isTeamFormat =
      config.tournamentFormat === 'Team Americano' ||
      config.tournamentFormat === 'Team Mexicano' ||
      config.tournamentFormat === 'King of the Court';

    if (isTeamFormat) {
      const pm: Record<string, string> = {};
      for (let i = 0; i < players.length - 1; i += 2) {
        const p1 = players[i].id;
        const p2 = players[i + 1].id;
        pm[p1] = p2;
        pm[p2] = p1;
      }
      finalConfig.partnerMap = pm;
      setConfig(prev => ({ ...prev, partnerMap: pm }));
    } else {
      finalConfig.partnerMap = undefined;
      setConfig(prev => ({ ...prev, partnerMap: undefined }));
    }

    const newMatches = generateSchedule(players, finalConfig, roundsCount, playerPointsMap);
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

  // Batch player addition from AI vision
  const handleAddPlayersBatch = (newPlayersList: { name: string; gender: GenderType; skillLevel: SkillLevelType }[]) => {
    const parsedPlayers: Player[] = newPlayersList.map((newP, index) => ({
      id: `usr-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
      name: newP.name,
      gender: newP.gender || 'Laki-laki',
      skillLevel: newP.skillLevel || 'Intermediate',
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      playingTime: 0,
      winRate: 0,
    }));

    setPlayers((prev) => [...prev, ...parsedPlayers]);
    showNotification(`Berhasil mendeteksi & menambahkan ${newPlayersList.length} atlet dari SS Reclub! 🎾`, 'success');
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

  // Update score of a match based on scoring settings of current event
  const handleUpdateScore = (matchId: string, s1: number, s2: number) => {
    if (s1 < 0 || s2 < 0) return;

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

  // Event Lobby CRUD triggers
  const handleCreateEvent = (data: {
    name: string;
    format: TournamentFormat;
    courtCount: number;
    matchDuration: number;
    roundsCount: number;
    scoringType: ScoringType;
    scoringValue: number;
    selectedPlayerIds: string[];
  }) => {
    const eventPlayers: Player[] = players
      .filter((p) => data.selectedPlayerIds.includes(p.id))
      .map((p) => ({
        ...p,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        points: 0,
        gamesWon: 0,
        gamesLost: 0,
        playingTime: 0,
        winRate: 0,
      }));

    const eventId = `evt-${Date.now()}`;
    const newConfig: TournamentConfig = {
      courtCount: data.courtCount,
      matchDuration: data.matchDuration,
      format: 'Doubles',
      winPoints: 2,
      drawPoints: 1,
      tournamentFormat: data.format,
      scoringType: data.scoringType,
      scoringValue: data.scoringValue
    };

    // Auto-partner mapping for Team formats
    if (data.format === 'Team Americano' || data.format === 'Team Mexicano' || data.format === 'King of the Court') {
      const pm: Record<string, string> = {};
      for (let i = 0; i < eventPlayers.length - 1; i += 2) {
        const p1 = eventPlayers[i].id;
        const p2 = eventPlayers[i + 1].id;
        pm[p1] = p2;
        pm[p2] = p1;
      }
      newConfig.partnerMap = pm;
    }

    const newEvent: PadelEvent = {
      id: eventId,
      name: data.name,
      createdAt: new Date().toISOString(),
      format: data.format,
      players: eventPlayers,
      matches: [],
      config: {
        courtCount: data.courtCount,
        matchDuration: data.matchDuration,
        format: 'Doubles',
        winPoints: 2,
        drawPoints: 1,
        tournamentFormat: data.format,
        roundsCount: data.roundsCount,
        scoringType: data.scoringType,
        scoringValue: data.scoringValue,
        partnerMap: newConfig.partnerMap
      },
      partnerMap: newConfig.partnerMap
    };

    loadedEventIdRef.current = eventId;
    setEvents((prev) => [...prev, newEvent]);
    setActiveEventId(eventId);
    setPlayers(eventPlayers);
    setMatches([]);
    setRoundsCount(data.roundsCount);
    setConfig(newConfig);
    setActiveTab('players');

    showNotification(`Event "${data.name}" berhasil dibuat! Silakan periksa & sesuaikan Roster Atlet di bawah.`);
  };

  const handleSelectEvent = (id: string) => {
    loadedEventIdRef.current = id;
    setActiveEventId(id);
    setActiveTab('dashboard');
    showNotification('Event berhasil dibuka.');
  };

  const handleCompleteEvent = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'Completed' } : e));
    showNotification('Event turnamen telah resmi diselesaikan dan dikunci! 🏆', 'success');
    setActiveTab('leaderboard');
  };

  const handleAddQuickPlayer = (name: string) => {
    handleAddPlayer({ name, gender: 'Laki-laki', skillLevel: 'Intermediate' });
  };

  const handleLoadSamplePlayers = () => {
    setPlayers(SEED_PLAYERS);
    setMatches([]);
    showNotification('14 Roster atlet contoh berhasil dimuat ke dalam event!', 'success');
  };

  const handleDeleteEvent = (id: string) => {
    triggerConfirm(
      'Hapus Event dari Riwayat',
      'Apakah Anda benar-benar yakin ingin menghapus event ini? Seluruh data tanding di dalamnya akan terhapus secara permanen.',
      () => {
        const nextEvents = events.filter(e => e.id !== id);
        setEvents(nextEvents);
        if (activeEventId === id) {
          if (nextEvents.length > 0) {
            setActiveEventId(nextEvents[0].id);
          } else {
            setActiveEventId(null);
            setPlayers([]);
            setMatches([]);
          }
        }
        showNotification('Event dihapus.', 'success');
      }
    );
  };

  const handleDuplicateEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    if (!target) return;
    const dupId = `evt-dup-${Date.now()}`;
    const dupEvent: PadelEvent = {
      ...target,
      id: dupId,
      name: `${target.name} (Salinan)`,
      createdAt: new Date().toISOString()
    };
    loadedEventIdRef.current = dupId;
    setEvents(prev => [...prev, dupEvent]);
    setActiveEventId(dupId);
    showNotification(`Berhasil menyalin "${target.name}".`);
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
    triggerConfirm(
      'Hapus Seluruh Data',
      'Apakah Anda benar-benar yakin ingin menghapus seluruh data sirkuit atlet dan jadwal pertandingan aktif?',
      () => {
        setPlayers([]);
        setMatches([]);
        showNotification('Database dibersihkan.', 'success');
      }
    );
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
                COTTA MASTER <span className="text-[9px] bg-teal-500/10 text-teal-400 py-1 px-1.5 rounded font-black border border-teal-550/20 tracking-wider">PRO</span>
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

        {/* Intelligent Step-by-Step Assistant / Process HUD */}
        <UserFlowWizard
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          players={players}
          matches={matches}
          config={config}
          roundsCount={roundsCount}
          events={events}
          activeEventId={activeEventId}
          onGenerateMatches={handleGenerateMatches}
          onCompleteEvent={handleCompleteEvent}
          onAddQuickPlayer={handleAddQuickPlayer}
          onLoadSamplePlayers={handleLoadSamplePlayers}
        />

        {/* Primary Tabs bar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          {/* Tabs Navigation */}
          <div className="flex flex-nowrap lg:flex-wrap items-center gap-1 bg-[#090D16] border border-slate-900 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto scrollbar-none shrink-0 pb-2 lg:pb-1.5">
            <button
              id="tab-btn-events"
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'events'
                  ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-lg shadow-teal-500/5'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-teal-400 font-bold animate-pulse" />
              Event & Turnamen
            </button>

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
              Roster Atlet ({players.length})
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
          {!activeEventId && activeTab !== 'events' ? (
            <div className="text-center py-16 px-6 bg-[#0B1220]/60 border border-slate-900 rounded-3xl space-y-5 max-w-lg mx-auto shadow-2xl backdrop-blur-md">
              <div className="mx-auto w-12 h-12 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center animate-bounce">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 opacity-90">
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Tidak Ada Event Aktif</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Semua tab sirkuit (Roster Atlet, Jadwal Arena, Klasemen Live) beroperasi secara dinamis berdasarkan data event yang sedang Anda buka. Silakan berpindah ke tab <b>Event &amp; Turnamen</b> untuk membuat event baru atau memuat kembali event dari riwayat sirkuit!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className="px-4 py-2 bg-teal-400 hover:bg-teal-500 active:scale-95 text-[#0F172A] text-xs font-black rounded-xl uppercase tracking-wider font-display transition-all cursor-pointer shadow-md inline-flex items-center gap-1"
              >
                Ke Tab Event &amp; Turnamen ➔
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'events' && (
                <EventManager
                  events={events}
                  activeEventId={activeEventId}
                  onSelectEvent={handleSelectEvent}
                  onDeleteEvent={handleDeleteEvent}
                  onDuplicateEvent={handleDuplicateEvent}
                  onCreateEvent={handleCreateEvent}
                  allSystemPlayers={players}
                  onGenerateMatches={handleGenerateMatches}
                  config={config}
                  roundsCount={roundsCount}
                  onChangeConfig={setConfig}
                  onChangeRoundsCount={setRoundsCount}
                  matches={matches}
                />
              )}

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
                        <p className="font-bold">Event Aktif Belum Di-Generate</p>
                        <p>
                          Silakan berpindah ke tab <b>Event & Turnamen</b> untuk menentukan parameter tanding dan mengeklik tombol <b>Generate Jadwal Laga</b> agar rotasi tanding dirumuskan otomatis!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Analytics graphics visualizations */}
                  <AnalyticsCharts
                    players={currentLeaderboard}
                    matches={matches}
                    events={events}
                    activeEventId={activeEventId}
                  />
                </div>
              )}

              {activeTab === 'players' && (
                <PlayerManager
                  players={players}
                  onAddPlayer={handleAddPlayer}
                  onRemovePlayer={handleRemovePlayer}
                  onReorderPlayers={handleReorderPlayers}
                  onExcelUpload={handleExcelUpload}
                  onAddPlayersBatch={handleAddPlayersBatch}
                />
              )}

              {activeTab === 'matches' && (
                <MatchList
                  matches={matches}
                  players={players}
                  onUpdateScore={handleUpdateScore}
                  onSetStatus={handleSetStatus}
                  onResetMatch={handleResetMatch}
                  scoringType={config.scoringType}
                  scoringValue={config.scoringValue}
                />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardPodium leaderboard={currentLeaderboard} />
              )}

              {activeTab === 'patungan' && (
                <CourtFeeCalculator players={players} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0B1220]/95 border border-slate-800 rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl space-y-4 text-center ring-1 ring-white/5"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-2">
                <Info className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white text-xs font-black rounded-xl transition-all cursor-pointer uppercase tracking-wider border border-slate-850"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-rose-500/15 cursor-pointer uppercase tracking-wider"
                >
                  Ya, Setuju
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
