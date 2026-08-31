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
  Compass,
  Sun,
  Moon,
  Cloud,
  CloudOff,
  RefreshCw,
  Check
} from 'lucide-react';
import { Player, Match, TournamentConfig, GenderType, SkillLevelType, TournamentFormat, ScoringType, PadelEvent } from './types';
import { generateSchedule, generateAdditionalRounds, recalculateLeaderboard, regenerateUnplayedMatches } from './utils/scheduler';
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
import FinanceModule from './components/FinanceModule';
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
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'events' | 'players' | 'matches' | 'leaderboard' | 'patungan' | 'finance'>('dashboard');
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cotta_theme') as 'dark' | 'light') || 'dark';
  });
  const [lightThemePreset, setLightThemePreset] = React.useState<'clay' | 'emerald' | 'cyan' | 'amber'>(() => {
    return (localStorage.getItem('cotta_light_preset') as 'clay' | 'emerald' | 'cyan' | 'amber') || 'emerald';
  });

  React.useEffect(() => {
    localStorage.setItem('cotta_theme', theme);
  }, [theme]);

  React.useEffect(() => {
    localStorage.setItem('cotta_light_preset', lightThemePreset);
  }, [lightThemePreset]);

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

  // State to track synchronization status & DB connection details
  const [syncStatus, setSyncStatus] = React.useState<'loading' | 'synced' | 'saving' | 'error'>('loading');
  const [dbDetails, setDbDetails] = React.useState<{
    connected: boolean;
    storage: string;
    reason?: string;
    hint?: string;
    isFetchFailed?: boolean;
    urlHost?: string | null;
  }>({ connected: false, storage: 'loading' });

  const [showDbSetupModal, setShowDbSetupModal] = React.useState(false);
  const initialLoadDoneRef = React.useRef(false);

  // Event History and active event
  const [events, setEvents] = React.useState<PadelEvent[]>([]);
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);

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

  // Check DB status on startup
  const checkDbHealth = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const info = await res.json();
        setDbDetails(info);
      }
    } catch (e) {
      console.warn("Failed to fetch DB status:", e);
    }
  };

  // Load initial data from the database
  React.useEffect(() => {
    async function loadData() {
      try {
        setSyncStatus('loading');
        await checkDbHealth();

        const res = await fetch('/api/events');
        if (!res.ok) throw new Error("Server error loading data");
        const data = await res.json();
        
        if (data && Array.isArray(data.events)) {
          if (data.events.length > 0) {
            setEvents(data.events);
            if (data.activeEventId) {
              setActiveEventId(data.activeEventId);
              loadedEventIdRef.current = data.activeEventId;
            }
          } else {
            loadLocalStorageFallback();
          }
          setSyncStatus('synced');
        } else {
          loadLocalStorageFallback();
        }
      } catch (e) {
        console.error("Failed to fetch events from server, falling back to local storage:", e);
        loadLocalStorageFallback();
        setSyncStatus('error');
      } finally {
        initialLoadDoneRef.current = true;
      }
    }

    function loadLocalStorageFallback() {
      try {
        const saved = localStorage.getItem('court_master_events');
        const activeId = localStorage.getItem('court_master_active_event_id');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            if (activeId) {
              setActiveEventId(activeId);
              loadedEventIdRef.current = activeId;
            }
          }
        }
      } catch (e) {}
      setSyncStatus('synced');
    }

    loadData();
  }, []);

  // Background real-time sync polling (runs every 8 seconds when window is active)
  React.useEffect(() => {
    if (!initialLoadDoneRef.current) return;

    const interval = setInterval(async () => {
      try {
        if (document.visibilityState !== 'visible') return;

        const res = await fetch('/api/events');
        if (!res.ok) return;
        const data = await res.json();

        if (data && Array.isArray(data.events) && data.events.length > 0) {
          const remoteStr = JSON.stringify(data.events);
          const localStr = JSON.stringify(events);

          if (remoteStr !== localStr) {
            console.log("[Realtime Sync] Incoming remote updates detected, updating state...");
            setEvents(data.events);
            if (data.activeEventId && data.activeEventId !== activeEventId) {
              setActiveEventId(data.activeEventId);
              loadedEventIdRef.current = data.activeEventId;
            }
          }
        }
      } catch (e) {
        // Silent background catch
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [events, activeEventId]);

  // Seed initial events ONLY on very first load if no data exists at all
  const userHasClearedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initialLoadDoneRef.current || syncStatus === 'loading' || userHasClearedRef.current) return;
    if (events.length === 0 && !localStorage.getItem('court_master_events')) {
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
  }, [events, syncStatus]);

  // Auto-save events and activeEventId to the database whenever they change
  React.useEffect(() => {
    if (!initialLoadDoneRef.current || syncStatus === 'loading') return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus('saving');
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events, activeEventId, allowEmpty: true }),
        });
        
        if (!res.ok) throw new Error("Failed to save data");
        
        localStorage.setItem('court_master_events', JSON.stringify(events));
        if (activeEventId) {
          localStorage.setItem('court_master_active_event_id', activeEventId);
        } else {
          localStorage.removeItem('court_master_active_event_id');
        }

        setSyncStatus('synced');
      } catch (e) {
        console.error("Failed to auto-save data to server:", e);
        setSyncStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [events, activeEventId]);

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

  // Add extra rounds to current schedule without destroying existing matches
  const handleAddRounds = (additionalRounds: number = 1) => {
    if (players.length < 2) {
      showNotification('Dibutuhkan minimal 2 atlet untuk menambah putaran tanding.', 'error');
      return;
    }
    if (config.format === 'Doubles' && players.length < 4) {
      showNotification('Dibutuhkan minimal 4 atlet untuk format ganda (Doubles).', 'error');
      return;
    }
    if (additionalRounds <= 0) return;

    // Build points map from dynamic leaderboard
    const playerPointsMap: Record<string, number> = {};
    currentLeaderboard.forEach((p) => {
      playerPointsMap[p.id] = p.points || 0;
    });

    const updatedMatches = generateAdditionalRounds(players, config, additionalRounds, matches, playerPointsMap);
    const addedMatchesCount = updatedMatches.length - matches.length;

    if (addedMatchesCount === 0) {
      showNotification('Gagal merumuskan pertambahan round.', 'error');
      return;
    }

    const newMaxRound = updatedMatches.reduce((max, m) => Math.max(max, m.round), 0);
    setRoundsCount(newMaxRound);
    setMatches(updatedMatches);
    showNotification(`Berhasil menambahkan ${additionalRounds} Round baru (${addedMatchesCount} pertandingan)! Total kini: ${newMaxRound} Round.`, 'success');
  };

  // Regenerate unplayed (Scheduled) matches using current roster
  const handleRegenerateUnplayedMatches = () => {
    if (matches.length === 0) return;
    const playerPointsMap: Record<string, number> = {};
    currentLeaderboard.forEach((p) => {
      playerPointsMap[p.id] = p.points || 0;
    });

    const updatedMatches = regenerateUnplayedMatches(players, config, matches, playerPointsMap);
    setMatches(updatedMatches);
    showNotification('Jadwal pertandingan mendatang (Belum Tanding) berhasil diperbarui berdasarkan roster atlet terbaru!', 'success');
  };

  // Swap / substitute player in a scheduled match
  const handleSwapPlayerInMatch = (matchId: string, teamNum: 1 | 2, playerIdx: number, newPlayerId: string) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const team = teamNum === 1 ? [...m.team1] : [...m.team2];
        team[playerIdx] = newPlayerId;
        return teamNum === 1 ? { ...m, team1: team } : { ...m, team2: team };
      })
    );
    const newPlayerName = players.find((p) => p.id === newPlayerId)?.name || 'Atlet';
    showNotification(`Pemain di pertandingan berhasil diganti dengan ${newPlayerName}.`, 'success');
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

    const updatedPlayers = [...players, player];
    setPlayers(updatedPlayers);

    if (matches.length > 0) {
      // Auto regenerate unplayed matches if schedule exists so new player is included smoothly
      const playerPointsMap: Record<string, number> = {};
      currentLeaderboard.forEach((p) => {
        playerPointsMap[p.id] = p.points || 0;
      });
      const updatedMatches = regenerateUnplayedMatches(updatedPlayers, config, matches, playerPointsMap);
      setMatches(updatedMatches);
      showNotification(`${newP.name} berhasil ditambahkan ke Roster dan jadwal mendatang telah diperbarui!`, 'success');
    } else {
      showNotification(`${newP.name} berhasil ditambahkan ke Roster.`);
    }
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

    const updatedPlayers = [...players, ...parsedPlayers];
    setPlayers(updatedPlayers);

    if (matches.length > 0) {
      const playerPointsMap: Record<string, number> = {};
      currentLeaderboard.forEach((p) => {
        playerPointsMap[p.id] = p.points || 0;
      });
      const updatedMatches = regenerateUnplayedMatches(updatedPlayers, config, matches, playerPointsMap);
      setMatches(updatedMatches);
      showNotification(`Berhasil menambahkan ${newPlayersList.length} atlet & memperbarui jadwal mendatang! 🎾`, 'success');
    } else {
      showNotification(`Berhasil mendeteksi & menambahkan ${newPlayersList.length} atlet dari SS Reclub! 🎾`, 'success');
    }
  };

  // Drag & drop sorting callback
  const handleReorderPlayers = (reordered: Player[]) => {
    setPlayers(reordered);
    showNotification('Posisi seeding atlet diatur ulang.');
  };

  // Remove player safely without destroying completed match score history
  const handleRemovePlayer = (id: string) => {
    const deletedName = players.find((p) => p.id === id)?.name || 'Atlet';
    const updatedPlayers = players.filter((p) => p.id !== id);
    setPlayers(updatedPlayers);

    if (matches.length > 0) {
      const playerPointsMap: Record<string, number> = {};
      currentLeaderboard.forEach((p) => {
        if (p.id !== id) playerPointsMap[p.id] = p.points || 0;
      });
      const updatedMatches = regenerateUnplayedMatches(updatedPlayers, config, matches, playerPointsMap);
      setMatches(updatedMatches);
      showNotification(`${deletedName} dihapus dari roster. Pertandingan mendatang berhasil diperbarui (skor selesai tetap tersimpan).`, 'success');
    } else {
      showNotification(`${deletedName} berhasil dihapus.`);
    }
  };

  // Remove all players from active roster
  const handleRemoveAllPlayers = () => {
    if (players.length === 0) return;
    triggerConfirm(
      'Hapus Semua Atlet Roster',
      'Apakah Anda benar-benar yakin ingin menghapus seluruh atlet dari roster event ini? Seluruh daftar atlet dan jadwal tanding terkait akan dikosongkan.',
      () => {
        setPlayers([]);
        setMatches([]);
        showNotification('Seluruh roster atlet berhasil dikosongkan.', 'success');
      }
    );
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

        const updatedStartTime = status === 'In Progress' ? (m.startTime || Date.now()) : m.startTime;

        let finalDurationSeconds = m.durationSeconds;
        let finalDuration = m.duration;
        if (status === 'Completed' && updatedStartTime) {
          finalDurationSeconds = Math.max(1, Math.floor((Date.now() - updatedStartTime) / 1000));
          finalDuration = Math.ceil(finalDurationSeconds / 60);
        }

        return {
          ...m,
          status,
          score1: nextScore1,
          score2: nextScore2,
          startTime: updatedStartTime,
          durationSeconds: finalDurationSeconds,
          duration: finalDuration,
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
              startTime: undefined,
              durationSeconds: undefined,
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
      async () => {
        const nextEvents = events.filter(e => e.id !== id);
        let nextActiveId = activeEventId;

        if (activeEventId === id) {
          if (nextEvents.length > 0) {
            nextActiveId = nextEvents[0].id;
            setActiveEventId(nextEvents[0].id);
          } else {
            nextActiveId = null;
            setActiveEventId(null);
            setPlayers([]);
            setMatches([]);
            userHasClearedRef.current = true;
          }
        }
        setEvents(nextEvents);

        // Instantly sync deletion with Supabase backend
        try {
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: nextEvents, activeEventId: nextActiveId, allowEmpty: true }),
          });
        } catch (e) {
          console.warn("Failed to sync event deletion with server:", e);
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
      async () => {
        userHasClearedRef.current = true;
        setEvents([]);
        setActiveEventId(null);
        setPlayers([]);
        setMatches([]);

        try {
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: [], activeEventId: null, allowEmpty: true }),
          });
        } catch (e) {}

        showNotification('Database dibersihkan.', 'success');
      }
    );
  };

  return (
    <div id="main-sports-wrapper" className={`min-h-screen font-sans relative overflow-hidden pb-12 transition-colors duration-300 ${
      theme === 'light' 
        ? `light-theme light-preset-${lightThemePreset} bg-slate-50 text-slate-900 selection:bg-teal-500 selection:text-slate-950` 
        : 'dark-theme bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-slate-950'
    }`}>
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
                
                {/* Cloud Sync Status Indicator */}
                {syncStatus === 'loading' && (
                  <button
                    onClick={() => setShowDbSetupModal(true)}
                    className="text-[9px] bg-blue-500/10 text-blue-400 py-1 px-2 rounded-full font-semibold border border-blue-500/20 tracking-wide flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Checking DB...
                  </button>
                )}
                {syncStatus === 'saving' && (
                  <button
                    onClick={() => setShowDbSetupModal(true)}
                    className="text-[9px] bg-amber-500/10 text-amber-400 py-1 px-2 rounded-full font-semibold border border-amber-500/20 tracking-wide flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Menyimpan...
                  </button>
                )}
                {syncStatus === 'synced' && dbDetails.connected && (
                  <button
                    onClick={() => setShowDbSetupModal(true)}
                    className="text-[9px] bg-emerald-500/10 text-emerald-400 py-1 px-2 rounded-full font-extrabold border border-emerald-500/25 tracking-wide flex items-center gap-1 cursor-pointer hover:bg-emerald-500/20 transition-all font-mono"
                    title="Terhubung ke Supabase Cloud DB (Klik untuk info)"
                  >
                    <Cloud className="w-2.5 h-2.5 text-emerald-400" /> Supabase Cloud
                  </button>
                )}
                {syncStatus === 'synced' && !dbDetails.connected && (
                  <button
                    onClick={() => setShowDbSetupModal(true)}
                    className="text-[9px] bg-amber-500/10 text-amber-300 py-1 px-2 rounded-full font-extrabold border border-amber-500/30 tracking-wide flex items-center gap-1 cursor-pointer hover:bg-amber-500/20 transition-all font-mono"
                    title="Penyimpanan Lokal / Memory (Klik untuk instruksi Supabase)"
                  >
                    <CloudOff className="w-2.5 h-2.5 text-amber-400" /> Local Fallback
                  </button>
                )}
                {syncStatus === 'error' && (
                  <button
                    onClick={() => setShowDbSetupModal(true)}
                    className="text-[9px] bg-rose-500/10 text-rose-400 py-1 px-2 rounded-full font-semibold border border-rose-500/20 tracking-wide flex items-center gap-1 cursor-pointer hover:bg-rose-500/20 transition-all"
                    title="Gagal terhubung ke Cloud (Klik untuk info)"
                  >
                    <CloudOff className="w-2.5 h-2.5 text-rose-400" /> Offline
                  </button>
                )}
              </h1>
              <p className="text-[9px] text-[#94A3B8] font-bold tracking-widest uppercase mt-1.5 font-mono">Excel Sports Scheduler & Analyst</p>
            </div>
          </div>

          {/* Quick Excel Action + Theme Toggler */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            {theme === 'light' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                <span className="text-[10px] text-slate-500 font-extrabold hidden xs:inline uppercase tracking-wider font-display">TEMA:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLightThemePreset('clay')}
                    className={`w-4 h-4 rounded-full transition-all relative ${
                      lightThemePreset === 'clay' 
                        ? 'ring-2 ring-orange-500 scale-110 border-orange-600' 
                        : 'border border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: '#ea580c' }}
                    title="Royal Clay Court (Terracotta)"
                  >
                    {lightThemePreset === 'clay' && <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />}
                  </button>
                  <button
                    onClick={() => setLightThemePreset('emerald')}
                    className={`w-4 h-4 rounded-full transition-all relative ${
                      lightThemePreset === 'emerald' 
                        ? 'ring-2 ring-green-500 scale-110 border-green-600' 
                        : 'border border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: '#10b981' }}
                    title="Padel Grass Turf (Emerald)"
                  >
                    {lightThemePreset === 'emerald' && <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />}
                  </button>
                  <button
                    onClick={() => setLightThemePreset('cyan')}
                    className={`w-4 h-4 rounded-full transition-all relative ${
                      lightThemePreset === 'cyan' 
                        ? 'ring-2 ring-cyan-500 scale-110 border-cyan-600' 
                        : 'border border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: '#06b6d4' }}
                    title="Ocean Breeze Clean (Cyan)"
                  >
                    {lightThemePreset === 'cyan' && <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />}
                  </button>
                  <button
                    onClick={() => setLightThemePreset('amber')}
                    className={`w-4 h-4 rounded-full transition-all relative ${
                      lightThemePreset === 'amber' 
                        ? 'ring-2 ring-amber-500 scale-110 border-amber-600' 
                        : 'border border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: '#f59e0b' }}
                    title="Warm Amber Sunset (Gold)"
                  >
                    {lightThemePreset === 'amber' && <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 bg-[#121B2E]/60 hover:bg-[#121B2E]/90 text-slate-200 hover:text-white rounded-xl border border-slate-800 shadow-md cursor-pointer transition-all flex items-center justify-center shrink-0"
              title={theme === 'dark' ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#6366F1]" />
              )}
            </button>

            <label
              htmlFor="excel-uploader"
              className="px-4 py-2 bg-[#121B2E]/60 hover:bg-[#121B2E] text-xs font-bold text-slate-200 hover:text-white rounded-xl border border-slate-800 shadow-md cursor-pointer transition-all flex items-center gap-2 font-display uppercase tracking-wider justify-center sm:w-auto"
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

            <button
              id="tab-btn-finance"
              onClick={() => setActiveTab('finance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-display shrink-0 ${
                activeTab === 'finance'
                  ? 'bg-[#0B1C10] text-emerald-400 border border-emerald-500/25 shadow-lg shadow-emerald-500/8'
                  : 'text-slate-450 hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Cotta Finance
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
                  onAddRounds={handleAddRounds}
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
                  onRemoveAllPlayers={handleRemoveAllPlayers}
                />
              )}

              {activeTab === 'matches' && (
                <MatchList
                  matches={matches}
                  players={players}
                  onUpdateScore={handleUpdateScore}
                  onSetStatus={handleSetStatus}
                  onResetMatch={handleResetMatch}
                  onAddRounds={handleAddRounds}
                  onRegenerateUnplayed={handleRegenerateUnplayedMatches}
                  onSwapPlayerInMatch={handleSwapPlayerInMatch}
                  scoringType={config.scoringType}
                  scoringValue={config.scoringValue}
                />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardPodium leaderboard={currentLeaderboard} eventName={events.find(e => e.id === activeEventId)?.name} />
              )}

              {activeTab === 'patungan' && (
                <CourtFeeCalculator players={players} />
              )}

              {activeTab === 'finance' && (
                <FinanceModule
                  activeEvent={activeEventId ? events.find(e => e.id === activeEventId) || null : null}
                  players={players}
                  showNotification={showNotification}
                />
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

      {/* Supabase DB Health & Diagnostics Modal */}
      <AnimatePresence>
        {showDbSetupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDbSetupModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0B1220]/95 border border-slate-800 rounded-3xl p-6 max-w-lg w-full relative z-10 shadow-2xl space-y-4 ring-1 ring-white/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl border ${
                    dbDetails.connected ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  }`}>
                    {dbDetails.connected ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">
                      Status Database Supabase
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Modul Sinkronisasi Cloud Realtime
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDbSetupModal(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status details card */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Koneksi Supabase:</span>
                    <span className={`font-black ${dbDetails.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {dbDetails.connected ? '🟢 TERHUBUNG (CONNECTED)' : '🟡 UNCONNECTED / FALLBACK'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tipe Penyimpanan:</span>
                    <span className="text-slate-200 font-bold uppercase">{dbDetails.storage}</span>
                  </div>
                  {dbDetails.reason && (
                    <div className="pt-2 border-t border-slate-900 text-[11px] text-amber-300">
                      <b>Keterangan:</b> {dbDetails.reason}
                    </div>
                  )}
                </div>

                {!dbDetails.connected && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-amber-200 space-y-3">
                    <div className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                      <Info className="w-4 h-4" /> {dbDetails.isFetchFailed ? 'Panduan Solusi Koneksi (fetch failed)' : 'Instruksi Setup Tabel Supabase SQL'}
                    </div>

                    {dbDetails.isFetchFailed ? (
                      <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                        <p className="text-amber-200 font-semibold">
                          Error <code className="text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded font-mono">TypeError: fetch failed</code> menandakan server gagal menghubungi domain Supabase ({dbDetails.urlHost || 'Supabase host'}). Ini <b>bukan</b> masalah tabel SQL hilang.
                        </p>
                        <p className="font-bold text-slate-200 mt-2">Solusi &amp; Langkah Pengecekan:</p>
                        <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-300">
                          <li>
                            <strong className="text-teal-300">Proyek Supabase Terjeda (Paused):</strong> Jika menggunakan akun gratis Supabase, proyek otomatis di-pause jika 7 hari tidak ada traffic. Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-teal-400 underline font-bold hover:text-teal-300">Dashboard Supabase</a> lalu klik <b>"Restore project"</b>.
                          </li>
                          <li>
                            <strong className="text-teal-300">Format SUPABASE_URL:</strong> Pastikan di Environment Variables URL diawali <code className="text-teal-300 font-mono">https://</code>, tanpa tanda petik atau spasi di awal/akhir URL.
                          </li>
                          <li>
                            <strong className="text-teal-300">Koneksi Network / Firewall:</strong> Pastikan server / local runner terhubung ke internet dan tidak memblokir HTTPS request ke Supabase.
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Jika Supabase sudah diberi <code className="text-teal-300">SUPABASE_URL</code> &amp; <code className="text-teal-300">SUPABASE_KEY</code> tetapi status masih belum terhubung, pastikan tabel <b>`padel_data`</b> sudah dibuat di <b>Supabase SQL Editor</b> dengan script ini:
                        </p>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-teal-300 select-all overflow-x-auto">
                          <pre>{`CREATE TABLE IF NOT EXISTS padel_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE padel_data DISABLE ROW LEVEL SECURITY;`}</pre>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {dbDetails.connected && (
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> Supabase Beroperasi Sempurna
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Seluruh browser yang membuka link aplikasi ini secara otomatis tersinkronisasi dan tidak akan kehilangan data event saat halaman di-refresh.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDbSetupModal(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer uppercase tracking-wider border border-slate-800"
                >
                  Tutup Info
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
