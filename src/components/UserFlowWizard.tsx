import React from 'react';
import {
  Compass,
  Users,
  Sliders,
  Calendar,
  Trophy,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Check,
  Award,
  TrendingUp,
  FileSpreadsheet,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { PadelEvent, Player, Match, TournamentConfig } from '../types';

interface UserFlowWizardProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'events' | 'players' | 'matches' | 'leaderboard' | 'patungan') => void;
  players: Player[];
  matches: Match[];
  config: TournamentConfig;
  roundsCount: number;
  events: PadelEvent[];
  activeEventId: string | null;
  onGenerateMatches: () => void;
  onCompleteEvent: (id: string) => void;
  onAddQuickPlayer: (name: string) => void;
  onLoadSamplePlayers?: () => void;
}

export default function UserFlowWizard({
  activeTab,
  setActiveTab,
  players,
  matches,
  config,
  roundsCount,
  events,
  activeEventId,
  onGenerateMatches,
  onCompleteEvent,
  onAddQuickPlayer,
  onLoadSamplePlayers
}: UserFlowWizardProps) {
  const [quickPlayerName, setQuickPlayerName] = React.useState('');
  const activeEvent = events.find(e => e.id === activeEventId);
  const minPlayersNeeded = config.format === 'Doubles' ? 4 : 2;
  const hasEnoughPlayers = players.length >= minPlayersNeeded;
  const hasMatches = matches.length > 0;
  
  const completedMatches = matches.filter(m => m.status === 'Completed');
  const uncompletedMatches = matches.filter(m => m.status !== 'Completed');
  const totalMatches = matches.length;
  const isDoneWithMatches = hasMatches && uncompletedMatches.length === 0;
  const isEventCompleted = activeEvent?.status === 'Completed';

  // Calculate current active step (1 to 5)
  let currentStep = 1;
  if (!activeEventId) {
    currentStep = 1; // Needs to create/select event
  } else if (!hasEnoughPlayers) {
    currentStep = 2; // Needs to manage players
  } else if (!hasMatches) {
    currentStep = 3; // Ref & config parameter is okay but matches need to be generated
  } else if (!isDoneWithMatches) {
    currentStep = 4; // Matches in progress
  } else if (!isEventCompleted) {
    currentStep = 5; // Matches done, can finalize event
  } else {
    currentStep = 6; // Fully completed tournament!
  }

  const steps = [
    { id: 1, label: 'Pilih Event', icon: Compass, tab: 'events' as const },
    { id: 2, label: 'Roster Atlet', icon: Users, tab: 'players' as const },
    { id: 3, label: 'Format & Skor', icon: Sliders, tab: 'events' as const },
    { id: 4, label: 'Mulai Laga', icon: Calendar, tab: 'matches' as const },
    { id: 5, label: 'Klasemen & Kunci', icon: Trophy, tab: 'leaderboard' as const }
  ];

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPlayerName.trim()) return;
    onAddQuickPlayer(quickPlayerName.trim());
    setQuickPlayerName('');
  };

  return (
    <div className="bg-[#0B1220]/75 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-md space-y-6 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-teal-500/[0.04] rounded-full blur-[50px] pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-indigo-500/[0.04] rounded-full blur-[50px] pointer-events-none" />

      {/* Header section with step metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-amber-400/10 text-amber-400 font-extrabold border border-amber-500/20 py-0.5 px-2 rounded-full font-mono uppercase tracking-widest">
              GUIDED JOURNEY
            </span>
            <span className="text-slate-700 text-xs">•</span>
            <span className="text-xs text-slate-400 font-semibold">
              Event Aktif: <b className="text-teal-300 font-bold">{activeEvent ? activeEvent.name : 'Belum Memilih'}</b>
            </span>
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest font-display flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-teal-400" />
            Asisten Cerdas Cotta Padel
          </h2>
        </div>
        
        {/* Step progress count bubble */}
        <div className="text-[10px] font-mono font-black text-indigo-400 bg-indigo-500/10 py-1 px-3.5 rounded-full border border-indigo-500/25 uppercase shrink-0">
          PROSES: {currentStep > 5 ? 'Turnamen Selesai' : `Langkah ${currentStep} dari 5`}
        </div>
      </div>

      {/* Progress pipeline visual bars */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {steps.map((s) => {
          const isDone = currentStep > s.id;
          const isActive = currentStep === s.id;
          const isLocked = currentStep < s.id;
          const StepIcon = s.icon;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.tab)}
              className={`p-3 rounded-2xl border transition-all text-left relative group ${
                isActive
                  ? 'bg-teal-500/10 border-teal-500/30 ring-1 ring-teal-500/20'
                  : isDone
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-80 hover:opacity-100'
                  : 'bg-slate-950/20 border-slate-900/60 opacity-50 hover:opacity-75'
              }`}
            >
              {/* Dynamic status badge top right */}
              <div className="absolute top-3 right-3">
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-teal-400 stroke-[3]" />
                ) : isActive ? (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-400"></span>
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-600">Lock</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border shrink-0 ${
                  isActive 
                    ? 'bg-teal-400 text-slate-950 border-teal-300' 
                    : isDone 
                    ? 'bg-slate-950 text-teal-450 border-slate-800' 
                    : 'bg-slate-950 text-slate-600 border-slate-900'
                }`}>
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">Langkah 0{s.id}</p>
                  <p className={`text-[10px] font-black uppercase tracking-wider truncate mt-1 ${
                    isActive ? 'text-teal-350' : isDone ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {s.label}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic helper box based on current flow state */}
      <div className="bg-[#0e1626]/60 border border-slate-850 p-4 md:p-5 rounded-2xl relative">
        <Sparkles className="absolute top-4 right-4 w-5 h-5 text-teal-500/5 animate-pulse" />
        
        {/* STEP 1: No active event select */}
        {currentStep === 1 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 py-0.5 px-2 rounded font-black upper">
                MEMULAI / PILIH EVENT
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">
                Mulai Dari Sini: Buat Atau Pilih Event Terlebih Dahulu
              </h3>
              <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
                Setiap pertandingan diorganisir dalam sebuah <b>Event / Turnamen</b>. Silakan buat event olahraga kustom baru Anda (misal: "Turnamen Senin Malam") atau muat salah satu event yang tersimpan di panel riwayat.
              </p>
            </div>
            <button
              id="wizard-go-events-1"
              type="button"
              onClick={() => setActiveTab('events')}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider font-display shrink-0"
            >
              Ke Form Event
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: Active event set but athletes count not enough */}
        {currentStep === 2 && (
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono bg-[#E2B93B]/10 text-yellow-500 border border-yellow-500/20 py-0.5 px-2 rounded font-black uppercase">
                  MANAJEMEN ROSTER ATLET
                </span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">
                  Daftarkan Atlet Yang Hadir (Roster Terisi: {players.length} Pemain)
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Turnamen membutuhkan minimal <b className="text-teal-300 font-mono font-bold">{minPlayersNeeded} pemain</b> untuk format <b className="text-teal-300">{config.format}</b>. Anda dapat <b>mengimpor nama atlet dari berkas Excel offline secara cepat</b> (klik tombol "Upload Atlet Excel" di pojok kanan atas) atau mendaftarkan nama manual di tab Roster Atlet.
                </p>
              </div>

              {/* Quick Input Player manual form directly inside wizard to quickstart if they want */}
              <div className="space-y-3">
                <form onSubmit={handleQuickAdd} className="flex gap-2 max-w-md bg-slate-950 p-1.5 rounded-xl border border-slate-900">
                  <input
                    id="wizard-quick-player"
                    type="text"
                    placeholder="Ketik nama atlet untuk tambah cepat..."
                    value={quickPlayerName}
                    onChange={(e) => setQuickPlayerName(e.target.value)}
                    className="bg-transparent border-0 text-xs px-2.5 py-1 text-white focus:outline-none focus:ring-0 flex-1 placeholder-slate-600"
                  />
                  <button
                    id="btn-wizard-quick-add"
                    type="submit"
                    className="px-3 py-1.5 bg-teal-400 hover:bg-teal-500 text-[#0F172A] font-black text-[10px] rounded-lg uppercase tracking-wider transition-all flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </form>

                {players.length === 0 && onLoadSamplePlayers && (
                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                    <span className="text-[10px] text-slate-500 font-mono">Bingung mau ketik satu-satu?</span>
                    <button
                      type="button"
                      onClick={onLoadSamplePlayers}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/25 hover:border-indigo-400/40 rounded-xl transition-all text-[11px] font-black font-display uppercase tracking-wider cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      Muat / Hubungkan 14 Roster Contoh Instan ⚡
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto self-center">
              <button
                id="wizard-go-players-2"
                type="button"
                onClick={() => setActiveTab('players')}
                className="px-4 py-2.5 bg-teal-400 hover:bg-teal-500 text-slate-950 font-black text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider font-display"
              >
                Ke Roster Atlet
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
              
              <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-500" />
                Dibutuhkan {minPlayersNeeded - players.length} atlet lagi
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Players are enough, but Matches are empty. Configuration details */}
        {currentStep === 3 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/25 py-0.5 px-2 rounded font-black uppercase">
                FORMULASI & GENERATE MATCHES
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">
                Verifikasi Parameter &amp; Generate Jadwal Pertandingan
              </h3>
              <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
                Kerangka atlet telah siap ({players.length} atlet terdaftar). Format turnamen aktif adalah <b className="text-teal-300 font-bold">{config.tournamentFormat}</b> dengan jumlah lapangan aktif <b className="text-slate-250 font-bold font-mono">{config.courtCount} lap</b>. Tekan tombol <b>Generate Jadwal Laga</b> di bawah untuk merumuskan rotasi tanding secara otomatis menggunakan algoritma padel cerdas yang adil!
              </p>
              
              <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1 flex-wrap">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-450" /> {players.length} Atlet Sedia</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-450" /> Format: {config.format}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-450" /> Scoring: {config.scoringType} ({config.scoringValue} pts)</span>
              </div>
            </div>

            <button
              id="wizard-generate-3"
              type="button"
              onClick={onGenerateMatches}
              className="px-5 py-3.5 bg-amber-400 hover:bg-amber-500 active:scale-95 text-[#0F172A] font-black text-xs rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-display shrink-0"
            >
              <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              Generate Jadwal Laga
            </button>
          </div>
        )}

        {/* STEP 4: Matches are available, score entry is active */}
        {currentStep === 4 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[9px] font-mono bg-teal-500/15 text-teal-400 border border-teal-500/20 py-0.5 px-2 rounded font-black uppercase">
                PERTANDINGAN BERJALAN (LIVE ROUNDS)
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-400 animate-pulse" />
                Progress Sirkuit: {completedMatches.length} / {totalMatches} Laga Selesai (`{Math.round((completedMatches.length / totalMatches) * 100)}`%)
              </h3>
              <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
                Jadwal pertandingan telah dirumuskan secara terstruktur. Para atlet dapat langsung bertanding berdasarkan ronde dan lapangan sirkuit. Setelah tanding, silakan isi hasil skor tim di tab <b>Jadwal Arena</b> untuk memperbarui statistik klasemen para atlet secara langsung!
              </p>
              
              {/* Active uncompleted matches countdown */}
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-450 animate-ping" />
                Sisa <b>{uncompletedMatches.length} pertandingan</b> lagi untuk menyelesaikan event ini.
              </div>
            </div>

            <button
              id="wizard-go-matches-4"
              type="button"
              onClick={() => setActiveTab('matches')}
              className="px-4 py-2.5 bg-teal-400 hover:bg-teal-500 text-slate-950 font-black text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider font-display shrink-0"
            >
              Input Skor Pertandingan
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>
        )}

        {/* STEP 5: Matches are fully done, ready to finalize/lock event */}
        {currentStep === 5 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 py-0.5 px-2 rounded font-black uppercase flex items-center gap-1 w-max">
                <Award className="w-3 h-3 text-emerald-400" />
                TURNAMEN SELESAI &amp; PODIUM SIAP
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">
                Luar Biasa! Semua Pertandingan Telah Selesai ({completedMatches.length}/{totalMatches} Laga)
              </h3>
              <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
                Seluruh rangkaian pertandingan sirkuit di lapangan telah selesai dicatat. Anda dapat berpindah ke tab <b>Klasemen Rank</b> untuk melihat penobatan podium atlet terbaik, lalu tekan tombol <b>Kunci &amp; Selesaikan Event</b> agar rekor turnamen ini tersimpan secara permanen dalam riwayat.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                id="wizard-go-leaderboard-5"
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-black text-[11px] rounded-xl transition-all border border-slate-850 flex items-center justify-center gap-1.5 uppercase tracking-wider font-display"
              >
                Lihat Podium
              </button>
              
              <button
                id="wizard-finalize-event-5"
                type="button"
                onClick={() => {
                  if (activeEventId) {
                    onCompleteEvent(activeEventId);
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-[11px] rounded-xl shadow-lg shadow-emerald-500/15 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider font-display"
              >
                Kunci &amp; Selesaikan Event 🏆
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Event complete! Celebrate/Reset or start new */}
        {currentStep === 6 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-indigo-950/20 to-emerald-950/20 border border-emerald-500/10 p-4 rounded-xl">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 px-2 rounded font-black uppercase">
                COMMITTED HISTORY ARCHIVED
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                Event Terkunci Dan Berhasil Diarsipkan!
              </h3>
              <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
                Turnamen ini telah resmi ditandai selesai. Skor dan klasemen akhir tidak dapat diubah kembali untuk menghindari kecurangan atau kesalahan editing pasca-turnamen di komunitas atlet Anda. Anda dapat menduplikat parameter ini untuk memulai pertandingan baru di sirkuit atau mengelola event baru!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                id="wizard-done-leaderboard"
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-[11px] rounded-xl transition-all border border-slate-850 flex items-center justify-center gap-1.5 uppercase tracking-wider font-display"
              >
                Hasil Akhir
              </button>
              
              <button
                id="wizard-start-new-event"
                type="button"
                onClick={() => setActiveTab('events')}
                className="px-4 py-2.5 bg-teal-400 hover:bg-teal-500 text-slate-950 font-black text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider font-display"
              >
                Mulai Event Baru
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
