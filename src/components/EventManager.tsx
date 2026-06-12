import React from 'react';
import { PadelEvent, Player, TournamentFormat, ScoringType, TournamentConfig, Match } from '../types';
import {
  Calendar,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Info,
  CheckCircle2,
  Users,
  Trophy,
  Sliders,
  Sparkles
} from 'lucide-react';

interface EventManagerProps {
  events: PadelEvent[];
  activeEventId: string | null;
  onSelectEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onDuplicateEvent: (id: string) => void;
  onCreateEvent: (newEventData: {
    name: string;
    format: TournamentFormat;
    courtCount: number;
    matchDuration: number;
    roundsCount: number;
    scoringType: ScoringType;
    scoringValue: number;
    selectedPlayerIds: string[];
  }) => void;
  allSystemPlayers: Player[];
  onGenerateMatches: () => void;
  config: TournamentConfig;
  roundsCount: number;
  onChangeConfig: (newConfig: TournamentConfig) => void;
  onChangeRoundsCount: (rounds: number) => void;
  matches: Match[];
}

export default function EventManager({
  events,
  activeEventId,
  onSelectEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onCreateEvent,
  allSystemPlayers,
  onGenerateMatches,
  config,
  roundsCount,
  onChangeConfig,
  onChangeRoundsCount,
  matches
}: EventManagerProps) {
  // New event form state
  const [name, setName] = React.useState('');
  const [format, setFormat] = React.useState<TournamentFormat>('Americano');
  const [courtCount, setCourtCount] = React.useState(2);
  const [matchDuration, setMatchDuration] = React.useState(20);
  const [formRoundsCount, setFormRoundsCount] = React.useState(3);
  const [scoringType, setScoringType] = React.useState<ScoringType>('BestOf');
  const [scoringPreset, setScoringPreset] = React.useState('4'); // 'Custom' or value
  const [customScoringValue, setCustomScoringValue] = React.useState(4);

  // Player selection state
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>([]);
  const [showRegenConfirm, setShowRegenConfirm] = React.useState(false);

  // Sync selected players on mount or when the parent players change
  React.useEffect(() => {
    if (allSystemPlayers.length > 0 && selectedPlayerIds.length === 0) {
      setSelectedPlayerIds(allSystemPlayers.map((p) => p.id));
    }
  }, [allSystemPlayers]);

  const handleSelectAllPlayers = () => {
    setSelectedPlayerIds(allSystemPlayers.map((p) => p.id));
  };

  const handleSelectNonePlayers = () => {
    setSelectedPlayerIds([]);
  };

  const handleTogglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama Event tidak boleh kosong!');
      return;
    }

    onCreateEvent({
      name,
      format,
      courtCount,
      matchDuration: 20,
      roundsCount: formRoundsCount,
      scoringType: 'BestOf',
      scoringValue: 4,
      selectedPlayerIds: selectedPlayerIds
    });

    // Reset Form Name
    setName('');
  };

  const activeEvent = events.find((e) => e.id === activeEventId);

  // Team pairing simulation for UI feedback
  const previewPairs = React.useMemo(() => {
    const list: string[] = [];
    const activePlayers = allSystemPlayers;
    for (let i = 0; i < activePlayers.length - 1; i += 2) {
      list.push(`${activePlayers[i].name} & ${activePlayers[i + 1].name}`);
    }
    return list;
  }, [allSystemPlayers]);

  return (
    <div id="event-lobby-wrapper" className="space-y-6">
      {/* Active Event Status Display */}
      {activeEvent && (
        <div className="bg-gradient-to-r from-teal-950/20 via-slate-900/40 to-indigo-950/20 border border-teal-500/20 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-[40px] pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-500/10 pb-5 mb-5">
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] bg-teal-500/10 text-teal-400 py-1 px-2.5 rounded-full font-black border border-teal-500/20 tracking-wider uppercase font-mono inline-block">
                TANDING AKTIF
              </span>
              <h2 className="text-lg md:text-xl font-black text-white truncate font-display leading-tight">{activeEvent.name}</h2>
              <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                Format: <b className="text-teal-300 font-bold">{activeEvent.format}</b>
                &nbsp;•&nbsp;
                Rating: <b className="text-slate-300 font-bold">{activeEvent.players.length} Players</b>
                &nbsp;•&nbsp;
                Laga: <b className="text-slate-300 font-bold">{activeEvent.matches.length} Pertandingan</b>
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-xs font-mono font-bold text-slate-450 text-right hidden lg:block">
                Dibuat pada: {new Date(activeEvent.createdAt).toLocaleDateString()}
              </div>
              <button
                type="button"
                onClick={() => onDuplicateEvent(activeEvent.id)}
                className="p-3 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-300 rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold font-display uppercase tracking-wider"
                title="Duplikasi Event Aktif"
              >
                <Copy className="w-3.5 h-3.5" /> Duplikasi
              </button>
            </div>
          </div>

          {/* Connected Param and Match Generation section inside the active event */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-950/30 -mx-5 -mb-5 p-5 md:-mx-6 md:-mb-6 md:p-6 rounded-b-[22px] border-t border-slate-800/55">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Sliders className="w-4 h-4 text-amber-500" />
                Parameter & Jadwal Pertandingan
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
                Tentukan parameter di bawah untuk mengacak tim, lawan, dan putaran tanding secara merata dan fair menggunakan algoritma padel otomatis.
              </p>
              
              <div className="flex gap-4 items-center flex-wrap pt-1.5">
                {/* Court Count Param Input */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Lapangan:</span>
                  <input
                    id="evt-active-courts"
                    type="number"
                    min={1}
                    max={10}
                    value={config.courtCount}
                    onChange={(e) => onChangeConfig({ ...config, courtCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-teal-300 font-mono font-bold focus:border-teal-400 focus:outline-none"
                  />
                </div>

                {/* Putaran (Rounds) Param Input */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Putaran (Rounds):</span>
                  <input
                    id="evt-active-rounds"
                    type="number"
                    min={1}
                    max={15}
                    value={roundsCount}
                    onChange={(e) => onChangeRoundsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-teal-300 font-mono font-bold focus:border-teal-400 focus:outline-none"
                  />
                </div>

                {/* Format Laga Option */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Ref:</span>
                  <select
                    id="evt-active-format"
                    value={config.format}
                    onChange={(e) => onChangeConfig({ ...config, format: e.target.value as 'Singles' | 'Doubles' })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-teal-300 font-extrabold focus:border-teal-400 focus:outline-none"
                  >
                    <option value="Doubles">Doubles (Ganda)</option>
                    <option value="Singles">Singles (Tunggal)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full xl:w-auto">
              {matches.length === 0 ? (
                <button
                  type="button"
                  id="btn-evt-generate-initial"
                  onClick={onGenerateMatches}
                  className="px-5 py-3 bg-amber-400 hover:bg-amber-500 active:scale-95 text-[#0F172A] font-black text-xs rounded-xl shadow-lg shadow-amber-400/10 transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-display shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5] animate-bounce" />
                  Generate Jadwal Laga
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                  {!showRegenConfirm ? (
                    <>
                      <span className="text-[10px] bg-teal-500/10 text-teal-400 font-black border border-teal-500/20 py-2 px-3.5 rounded-xl text-center font-mono">
                        Jadwal Aktif: {matches.length} Laga
                      </span>
                      
                      <button
                        type="button"
                        id="btn-evt-regenerate-prompt"
                        onClick={() => setShowRegenConfirm(true)}
                        className="px-4 py-2.5 bg-[#0F172A]/80 border border-slate-800 hover:bg-rose-950/20 hover:text-rose-450 hover:border-rose-900/30 text-slate-300 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-display cursor-pointer"
                      >
                        Atur Ulang Jadwal
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-rose-950/25 border border-rose-500/20 p-2 rounded-xl w-full">
                      <span className="text-[10px] text-rose-300 font-bold leading-tight px-1.5 py-1">
                        Hapus skor &amp; acak ulang jadwal?
                      </span>
                      <div className="flex gap-1.5 shrink-0 ml-auto">
                        <button
                          type="button"
                          id="btn-evt-regenerate-confirm"
                          onClick={() => {
                            onGenerateMatches();
                            setShowRegenConfirm(false);
                          }}
                          className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black text-[9px] rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Ya, Reset
                        </button>
                        <button
                          type="button"
                          id="btn-evt-regenerate-cancel"
                          onClick={() => setShowRegenConfirm(false)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 font-bold text-[9px] rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Creation Form (Left Side) */}
        <form onSubmit={handleSubmit} className="bg-[#121B2E]/30 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-5 xl:col-span-7 backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-850/80 pb-3">
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-2 rounded-xl text-slate-950 shadow-md shrink-0">
              <Plus className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">Buat Event Baru</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Buat sirkuit turnamen padel kustom Anda dalam sekejap.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Event Name */}
            <div>
              <label htmlFor="evt-form-name" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                Nama Event / Turnamen
              </label>
              <input
                id="evt-form-name"
                type="text"
                placeholder="Misal: Padel Champions Cup, Internal Roster A, Regular Pool..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 font-sans"
              />
            </div>

            {/* Tournament Format Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="evt-form-format" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                  Format Turnamen
                </label>
                <select
                  id="evt-form-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                  className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                >
                  <option value="Americano">Americano (Individu)</option>
                  <option value="Mexicano">Mexicano (Dynamic Standings)</option>
                  <option value="Mixicano">Mixicano (Dynamic Standings Genders)</option>
                  <option value="Mixed Americano">Mixed Americano (Genders)</option>
                  <option value="Team Americano">Team Americano (Duo Tetap)</option>
                  <option value="Team Mexicano">Team Mexicano (Duo Tetap Standings)</option>
                  <option value="Super Mexicano">Super Mexicano (Extra Multipliers)</option>
                  <option value="King of the Court">King of the Court (Ladder Court)</option>
                </select>
              </div>

              {/* Court Count */}
              <div>
                <label htmlFor="evt-form-courts" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                  Jumlah Lapangan (Courts)
                </label>
                <input
                  id="evt-form-courts"
                  type="number"
                  min={1}
                  max={10}
                  value={courtCount}
                  onChange={(e) => setCourtCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 font-mono"
                />
              </div>
            </div>

            {/* Config matches settings preset */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="evt-form-rounds" className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-display">
                  Rounds / Putaran Laga
                </label>
                <input
                  id="evt-form-rounds"
                  type="number"
                  min={1}
                  max={20}
                  value={formRoundsCount}
                  onChange={(e) => setFormRoundsCount(Math.max(1, parseInt(e.target.value) || 3))}
                  className="w-full bg-slate-950/90 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 font-mono"
                />
              </div>
            </div>

            {/* Players checklist Selection */}
            {allSystemPlayers.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
                    Pilih Atlet yang Ikut Serta ({selectedPlayerIds.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPlayers}
                      className="text-[9px] font-extrabold text-teal-400 hover:text-teal-350 uppercase tracking-wider cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-800 text-[9px]">•</span>
                    <button
                      type="button"
                      onClick={handleSelectNonePlayers}
                      className="text-[9px] font-extrabold text-[#94A3B8] hover:text-[#CCD6F6] uppercase tracking-wider cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {allSystemPlayers.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    return (
                      <label
                        key={player.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-500/5 border-teal-500/35 text-white'
                            : 'bg-slate-950/30 border-slate-900/40 text-slate-450 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePlayer(player.id)}
                            className="rounded border-slate-850 text-teal-500 focus:ring-teal-500/30 bg-slate-950 w-3.5 h-3.5"
                          />
                          <span className="text-xs font-semibold truncate max-w-sm">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pr-1">
                          <span className="text-[9px] font-bold opacity-80 uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                            {player.gender}
                          </span>
                          <span className="text-[9px] font-black opacity-80 text-teal-450 font-mono">
                            {player.winRate}% WR
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team pairing visual preview if team format selected */}
            {(format === 'Team Americano' || format === 'Team Mexicano' || format === 'King of the Court') && (
              <div className="bg-emerald-950/15 border border-emerald-500/20 p-4 rounded-2xl text-xs text-emerald-200 space-y-2">
                <p className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-450 shrink-0" />
                  Rotasi Tim Tetap Aktif!
                </p>
                <p className="text-[10px] leading-relaxed text-[#B7E4C7]">
                  Dalam format Tim Duo Tetap, para atlet akan dipasangkan berdasarkan baris roster (atlet baris 1 &amp; 2, dst). Re-order (drag &amp; drop) di tab <b>Roster Atlet</b> jika ingin mengatur partner tanding secara dinamis!
                </p>
                {previewPairs.length > 0 && (
                  <div className="text-[9px] font-mono font-bold bg-slate-950/40 p-2 rounded-xl text-slate-350 max-h-24 overflow-y-auto">
                    Kombinasi Tim: <span className="text-teal-400">{previewPairs.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-teal-400 hover:bg-teal-500 active:scale-95 text-[#0F172A] text-xs font-black rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-display uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 text-[#0F172A]" />
            BUAT & SIMPAN EVENT
          </button>
        </form>

        {/* History / Saved Events (Right Side) */}
        <div className="space-y-4 xl:col-span-5 flex flex-col">
          <div className="bg-[#121B2E]/30 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 flex-1 backdrop-blur-md">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-850/80">
              <div className="bg-[#0f172a]/80 p-2 rounded-xl border border-slate-850">
                <FolderOpen className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">Riwayat Event ({events.length})</h3>
                <p className="text-[10px] text-slate-400 font-medium">Buka, delete, atau gandakan putaran lama.</p>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 text-xs font-bold text-slate-500 font-mono">
                Belum ada event tersimpan di riwayat.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {events.map((e) => {
                  const isActive = e.id === activeEventId;
                  const totalCompletedMatches = e.matches.filter((m) => m.status === 'Completed').length;
                  return (
                    <div
                      key={e.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-teal-500/5 border-teal-500/30 shadow-md ring-1 ring-teal-500/10 shadow-teal-500/[0.02]'
                          : 'bg-slate-900/40 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-black text-white font-display truncate leading-none">
                            {e.name}
                          </p>
                          {isActive && (
                            <span className="text-[8px] bg-teal-500/10 text-teal-400 py-0.5 px-1.5 rounded font-black border border-teal-500/20 uppercase tracking-widest font-mono shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#A0AEC0] font-medium">
                          {e.format} • {e.players?.length || 0} Players • {e.matches?.length || 0} Matches
                        </p>
                        <p className="text-[9px] font-mono font-bold text-slate-450 uppercase">
                          Selesai: <span className="text-slate-300 font-black">{totalCompletedMatches}/{e.matches?.length || 0}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-[#94A3B8] shrink-0">
                        {/* Open Button */}
                        <button
                          type="button"
                          onClick={() => onSelectEvent(e.id)}
                          className={`p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                            isActive
                              ? 'bg-teal-500 text-slate-950 font-black hover:bg-teal-400'
                              : 'bg-slate-950 hover:bg-slate-800 hover:text-white border border-slate-850'
                          }`}
                          title="Buka Pertandingan ini"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate Button */}
                        <button
                          type="button"
                          onClick={() => onDuplicateEvent(e.id)}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 hover:text-white border border-slate-850 rounded-lg transition-all active:scale-95 cursor-pointer"
                          title="Duplikasi"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(e.id)}
                          className="p-2.5 bg-[#120F17] hover:bg-rose-950 hover:text-rose-400 border border-slate-850 hover:border-rose-950 rounded-lg transition-all active:scale-95 cursor-pointer text-slate-550"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
