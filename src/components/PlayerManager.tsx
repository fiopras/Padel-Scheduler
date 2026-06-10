import React from 'react';
import { UserPlus, Trash2, ArrowUpDown, Download, Search, Sparkles, Move, Upload } from 'lucide-react';
import { Player, GenderType, SkillLevelType } from '../types';
import { downloadPlayerTemplate } from '../utils/excel';

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (player: { name: string; gender: GenderType; skillLevel: SkillLevelType }) => void;
  onRemovePlayer: (id: string) => void;
  onReorderPlayers: (reordered: Player[]) => void;
  onExcelUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PlayerManager({
  players,
  onAddPlayer,
  onRemovePlayer,
  onReorderPlayers,
  onExcelUpload,
}: PlayerManagerProps) {
  // New Player Form State
  const [name, setName] = React.useState('');
  const [gender, setGender] = React.useState<GenderType>('Laki-laki');
  const [skillLevel, setSkillLevel] = React.useState<SkillLevelType>('Intermediate');

  // Search
  const [search, setSearch] = React.useState('');

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddPlayer({ name: name.trim(), gender, skillLevel });
    setName('');
  };

  // Filtered list
  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const reordered = [...players];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, removed);
    onReorderPlayers(reordered);
    setDraggedIndex(null);
  };

  return (
    <div id="player-manager" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 1. Add Player Form */}
      <div className="lg:col-span-1 bg-[#121B2E]/40 p-4 sm:p-6 rounded-3xl border border-slate-800/80 space-y-6 h-fit backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500/0 via-teal-400 to-teal-500/0 opacity-40" />
        
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-tight">
            <UserPlus className="w-5 h-5 text-teal-400" />
            Tambah Atlet Baru
          </h3>
          <p className="text-xs text-slate-400 mt-1">Daftarkan roster secara manual atau unduh format template Excel di bawah.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-player-name" className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest font-display">
              Nama Atlet
            </label>
            <input
              id="new-player-name"
              type="text"
              placeholder="Contoh: Husen Maka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/85 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-all font-sans"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="new-player-gender" className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest font-display">
                Gender
              </label>
              <select
                id="new-player-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as GenderType)}
                className="w-full bg-slate-950/85 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-all font-medium"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label htmlFor="new-player-skill" className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest font-display">
                Skill Level
              </label>
              <select
                id="new-player-skill"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as SkillLevelType)}
                className="w-full bg-slate-950/85 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-all font-medium"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <button
            id="btn-add-player"
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-350 active:scale-95 text-slate-950 text-xs font-black py-3 px-4 rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-display uppercase tracking-wider"
          >
            <UserPlus className="w-4 h-4 fill-slate-950" />
            Tambahkan Atlet
          </button>
        </form>

        <div className="pt-5 border-t border-slate-800/60 text-center space-y-2">
          <p className="text-[11px] text-[#94A3B8] font-medium">Bekerja lebih cepat lewat berkas luring:</p>
          <button
            id="btn-download-template"
            onClick={downloadPlayerTemplate}
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-teal-400 hover:text-teal-350 transition-colors uppercase tracking-widest font-display"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel Template
          </button>
        </div>

        {onExcelUpload && (
          <div className="pt-4 border-t border-slate-800/60 space-y-3">
            <p className="text-[11px] text-slate-400 font-medium text-center">Sudah punya database pemain? Unggah langsung di sini:</p>
            <label
              htmlFor="excel-uploader-sidebar"
              className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-slate-950/60 hover:bg-slate-950/90 border border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl cursor-pointer transition-all duration-200 group text-center"
            >
              <Upload className="w-5 h-5 text-teal-450 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-teal-400 block transition-colors leading-normal">
                  Pilih / Unggah Berkas Excel
                </span>
                <span className="text-[10px] text-slate-500 block">
                  (.xlsx, .xls)
                </span>
              </div>
              <input
                id="excel-uploader-sidebar"
                type="file"
                accept=".xlsx, .xls"
                onChange={onExcelUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* 2. Drag & Drop Player List */}
      <div className="lg:col-span-2 bg-[#121B2E]/40 p-4 sm:p-6 rounded-3xl border border-slate-800/80 space-y-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-tight">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              Database Atlet ({players.length})
            </h3>
            <p className="text-xs text-slate-455 mt-1 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Drag & drop baris untuk mengatur Seeding rotasi partner.
            </p>
          </div>

          <div className="relative">
            <input
              id="search-player-manager"
              type="text"
              placeholder="Cari nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-48 bg-slate-950/80 border border-slate-850 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/25 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* List Grid */}
        <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1.5 font-sans">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs font-medium">
              Belum ada atlet yang terdaftar. Tambahkan atlet secara manual atau upload file Excel.
            </div>
          ) : (
            filtered.map((player, index) => {
              // Get actual index in main array
              const originalIndex = players.findIndex((p) => p.id === player.id);
              
              return (
                <div
                  key={player.id}
                  id={`player-row-${player.id}`}
                  draggable
                  onDragStart={() => handleDragStart(originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDrop={() => handleDrop(originalIndex)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border-slate-800/80 bg-[#0c1221]/50 border hover:border-slate-755 hover:bg-[#121B2E]/30 transition-all duration-200 cursor-grab ${
                    draggedIndex === originalIndex ? 'opacity-30 border-dashed border-teal-500/40 bg-teal-950/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                    <div className="text-[10px] font-black font-mono text-teal-400 bg-teal-500/5 border border-teal-500/10 w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                      {originalIndex + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-white truncate max-w-[170px] sm:max-w-[240px] md:max-w-none" title={player.name}>{player.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded-md uppercase">
                          {player.gender}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md font-display uppercase tracking-wider ${
                            player.skillLevel === 'Advanced'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : player.skillLevel === 'Intermediate'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : 'bg-slate-900 text-slate-450 border border-slate-800'
                          }`}
                        >
                          {player.skillLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 w-full sm:w-auto border-t border-slate-800/40 sm:border-0 pt-2.5 sm:pt-0">
                    <span className="text-[10px] font-bold font-mono text-slate-350 bg-slate-950 border border-slate-850 px-2 py-1 rounded-xl">
                      WR: <span className="text-teal-400 font-extrabold">{player.winRate}%</span> ({player.matchesPlayed} main)
                    </span>
                    <button
                      id={`btn-remove-player-${player.id}`}
                      onClick={() => onRemovePlayer(player.id)}
                      className="text-slate-500 hover:text-rose-455 p-2 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                      title="Hapus atlet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
