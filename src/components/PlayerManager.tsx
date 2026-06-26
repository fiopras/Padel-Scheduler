import React from 'react';
import { UserPlus, Trash2, ArrowUpDown, Download, Search, Sparkles, Move, Upload, Link, FileSpreadsheet } from 'lucide-react';
import { Player, GenderType, SkillLevelType } from '../types';
import { downloadPlayerTemplate } from '../utils/excel';

const compressImage = (dataUrl: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
  });
};

const fetchReclubHtmlClientSide = async (url: string): Promise<string> => {
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  const clientStrategies = [
    // 1. AllOrigins Proxy (JSONP/CORS wrapper)
    {
      name: "AllOrigins Proxy",
      fn: async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (json && json.contents) {
            return json.contents;
          }
          throw new Error("Empty contents from AllOrigins");
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      }
    },
    // 2. CorsProxy.io Proxy
    {
      name: "CorsProxy.io",
      fn: async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const htmlText = await res.text();
          if (htmlText.includes("Cloudflare") && (htmlText.includes("Access denied") || htmlText.includes("security check"))) {
            throw new Error("Blocked by Cloudflare on proxy");
          }
          return htmlText;
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      }
    },
    // 3. CodeTabs Proxy
    {
      name: "CodeTabs Proxy",
      fn: async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.text();
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      }
    }
  ];

  for (const strategy of clientStrategies) {
    try {
      console.log(`[Client-Side Import] Trying proxy strategy: ${strategy.name}`);
      const html = await strategy.fn();
      if (html && html.trim().length > 100) {
        console.log(`[Client-Side Import] Success via: ${strategy.name}`);
        return html;
      }
    } catch (err: any) {
      console.warn(`[Client-Side Import] Strategy ${strategy.name} failed:`, err?.message || err);
    }
  }

  throw new Error("Semua strategi pengambilan client-side gagal.");
};

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (player: { name: string; gender: GenderType; skillLevel: SkillLevelType }) => void;
  onRemovePlayer: (id: string) => void;
  onReorderPlayers: (reordered: Player[]) => void;
  onExcelUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddPlayersBatch?: (newPlayers: { name: string; gender: GenderType; skillLevel: SkillLevelType }[]) => void;
}

export default function PlayerManager({
  players,
  onAddPlayer,
  onRemovePlayer,
  onReorderPlayers,
  onExcelUpload,
  onAddPlayersBatch,
}: PlayerManagerProps) {
  // New Player Form State
  const [name, setName] = React.useState('');
  const [gender, setGender] = React.useState<GenderType>('Laki-laki');
  const [skillLevel, setSkillLevel] = React.useState<SkillLevelType>('Intermediate');

  // Search
  const [search, setSearch] = React.useState('');

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  // AI-powered Player Extraction States
  const [isAiRegistering, setIsAiRegistering] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [scanProgress, setScanProgress] = React.useState(0);
  const [scanStatusText, setScanStatusText] = React.useState('Membaca berkas gambar...');

  // Reclub Importer Selection State
  const [importMethod, setImportMethod] = React.useState<'link' | 'screenshot' | 'excel'>('link');

  // Reclub URL Importer States
  const [reclubUrl, setReclubUrl] = React.useState('');
  const [useRawHtml, setUseRawHtml] = React.useState(false);
  const [rawHtmlText, setRawHtmlText] = React.useState('');
  const [isReclubLoading, setIsReclubLoading] = React.useState(false);
  const [reclubUrlError, setReclubUrlError] = React.useState<string | null>(null);
  const [reclubUrlSuccess, setReclubUrlSuccess] = React.useState<string | null>(null);

  const handleReclubUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useRawHtml && !rawHtmlText.trim()) return;
    if (!useRawHtml && !reclubUrl.trim()) return;

    try {
      setIsReclubLoading(true);
      setReclubUrlError(null);
      setReclubUrlSuccess(null);

      let requestBody: any;

      if (useRawHtml) {
        requestBody = { rawHtml: rawHtmlText.trim() };
      } else {
        // Attempt browser-level client-side bypass to fetch Reclub HTML
        try {
          console.log('[PlayerManager] Attempting client-side fetch bypass...');
          const fetchedHtml = await fetchReclubHtmlClientSide(reclubUrl);
          console.log('[PlayerManager] Client-side fetch bypass succeeded!');
          requestBody = { rawHtml: fetchedHtml };
        } catch (clientFetchErr) {
          console.warn('[PlayerManager] Client-side fetch bypass failed, falling back to server-side fetch:', clientFetchErr);
          // Graceful fallback to server-side fetch
          requestBody = { url: reclubUrl.trim() };
        }
      }

      const response = await fetch('/api/import-reclub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Terjadi kesalahan sistem saat menghubungi server Reclub.');
      }

      const data = await response.json();
      if (!data.players || !Array.isArray(data.players) || data.players.length === 0) {
        throw new Error('Tidak ada pemain roster aktif yang ditemukan atau data kosong.');
      }

      // Convert roster to the structure expected by onAddPlayersBatch
      const mapped = data.players.map((item: any) => ({
        name: item.name || 'Pemain Tanpa Nama',
        gender: item.gender === 'Perempuan' ? ('Perempuan' as const) : ('Laki-laki' as const),
        skillLevel: (['Beginner', 'Intermediate', 'Advanced'].includes(item.skillLevel) ? item.skillLevel : 'Intermediate') as any
      }));

      if (onAddPlayersBatch) {
        onAddPlayersBatch(mapped);
      }

      setReclubUrlSuccess(`Berhasil mengimpor ${data.players.length} atlet dari "${data.eventName}" di "${data.venue}"! 🚀`);
      setReclubUrl('');
      setRawHtmlText('');
    } catch (err: any) {
      console.error('Reclub link import error:', err);
      setReclubUrlError(err.message || 'Gagal mengimpor daftar atlet.');
    } finally {
      setIsReclubLoading(false);
    }
  };

  const handleReclubImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAiRegistering(true);
      setScanProgress(5);
      setScanStatusText('Membaca berkas gambar...');
      setAiError(null);
      
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = async () => {
        setScanProgress(15);
        setScanStatusText('Memproses data gambar...');

        let currentProgress = 15;
        // Increment progress periodically up to 92% until api responds
        const interval = setInterval(() => {
          if (currentProgress < 92) {
            const increment = currentProgress < 40 ? 8 : (currentProgress < 70 ? 4 : 2);
            currentProgress += increment;
            setScanProgress(currentProgress);
            
            if (currentProgress < 35) {
              setScanStatusText('Mengompresi data untuk AI...');
            } else if (currentProgress < 55) {
              setScanStatusText('Sistem Visi Gemini AI memindai foto...');
            } else if (currentProgress < 75) {
              setScanStatusText('Mengekstrak list nama-nama atlet...');
            } else if (currentProgress < 90) {
              setScanStatusText('Memisahkan nama dan mendeteksi gender...');
            } else {
              setScanStatusText('Menyusun response roster...');
            }
          }
        }, 350);

        try {
          const resultStr = fileReader.result as string;
          // Compress the image client-side to dramatically reduce payload size (<200KB), avoiding Vercel payload limits & timeout crashes
          const compressedDataUrl = await compressImage(resultStr);
          const base64Data = compressedDataUrl.split(',')[1];
          const mimeType = "image/jpeg";

          const response = await fetch('/api/extract-players', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64Data, mimeType }),
          });

          clearInterval(interval);

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Server mengalami kendala saat memproses gambar.');
          }

          const data = await response.json();
          if (data && Array.isArray(data.players) && data.players.length > 0) {
            setScanProgress(100);
            setScanStatusText('Berhasil mengambil roster!');
            if (onAddPlayersBatch) {
              const mapped = data.players.map((item: any) => ({
                name: item.name || 'Pemain Tanpa Nama',
                gender: (item.gender === 'Perempuan' || item.gender === 'Lainnya') ? item.gender : 'Laki-laki',
                skillLevel: 'Intermediate' as const
              }));
              onAddPlayersBatch(mapped);
            }
          } else {
            setAiError('Tidak ada nama pemain yang terdeteksi dari screenshot. Pastikan screenshot memperlihatkan bagian roster "Participants" dengan jelas dan tajam.');
          }
        } catch (err: any) {
          clearInterval(interval);
          console.error('Error scanning screenshot:', err);
          setAiError(err.message || 'Gagal terhubung dengan server AI.');
        } finally {
          setIsAiRegistering(false);
        }
      };
      fileReader.onerror = () => {
        throw new Error('Gagal membaca file gambar.');
      };
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Gagal membaca file gambar.');
      setIsAiRegistering(false);
    } finally {
      // Clear value so the same file can be re-uploaded
      e.target.value = '';
    }
  };

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
          <p className="text-xs text-slate-400 mt-1">Daftarkan roster secara manual atau sinkronisasikan secara otomatis via link Reclub di bawah.</p>
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

        <div className="pt-4 border-t border-slate-800/60 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest font-display flex items-center gap-1.5 label-import">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Metode Impor Atlet
            </span>
            <span className="text-[8px] bg-teal-500/15 text-teal-400 font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
              Cepat & AI
            </span>
          </div>

          {/* Toggle Tab Bar */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/60 border border-slate-850/60 rounded-xl">
            <button
              id="tab-import-link"
              type="button"
              onClick={() => setImportMethod('link')}
              className={`py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer select-none ${
                importMethod === 'link'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-black shadow-inner shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Link className="w-3.5 h-3.5 shrink-0" />
              Link
            </button>
            <button
              id="tab-import-ss"
              type="button"
              onClick={() => setImportMethod('screenshot')}
              className={`py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer select-none ${
                importMethod === 'screenshot'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-black shadow-inner shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Screenshot
            </button>
            <button
              id="tab-import-excel"
              type="button"
              onClick={() => setImportMethod('excel')}
              className={`py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer select-none ${
                importMethod === 'excel'
                  ? 'bg-teal-400/10 text-teal-400 border border-teal-500/20 font-black shadow-inner shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              Excel
            </button>
          </div>

          {/* 1. LINK IMPORTER */}
          {importMethod === 'link' && (
            <div className="space-y-3.5">
              {!useRawHtml ? (
                <>
                  <p className="text-[10.5px] text-[#94A3B8] font-medium leading-relaxed">
                    Masukkan link/URL dari Reclub (misalnya: <code>https://reclub.co/id/m/E93XSO</code>) untuk mengimpor seluruh roster atlet secara langsung!
                  </p>

                  <form onSubmit={handleReclubUrlImport} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        id="reclub-url-input"
                        type="text"
                        placeholder="https://reclub.co/id/m/..."
                        value={reclubUrl}
                        onChange={(e) => setReclubUrl(e.target.value)}
                        disabled={isReclubLoading}
                        className="flex-1 bg-slate-950/85 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-all font-sans"
                      />
                      <button
                        id="btn-reclub-sync"
                        type="submit"
                        disabled={isReclubLoading || !reclubUrl.trim()}
                        className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 text-[10px] font-black px-3.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer uppercase tracking-wider font-display"
                      >
                        {isReclubLoading ? 'Mengimpor...' : 'Impor'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-[10.5px] text-[#94A3B8] font-semibold leading-normal">
                      Metode Salin-Tempel HTML Halaman Reclub
                    </p>
                    <p className="text-[9.5px] text-slate-400 leading-normal">
                      1. Buka halaman pertandingan Reclub di peramban Anda.<br/>
                      2. Klik kanan lalu pilih <b>Page Source / Lihat Sumber Halaman</b> (atau tekan <kbd className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-teal-400">Ctrl+U</kbd>).<br/>
                      3. Pilih semua kode (<kbd className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-teal-400">Ctrl+A</kbd>), salin (<kbd className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-teal-400">Ctrl+C</kbd>), lalu tempel di bawah:
                    </p>
                  </div>

                  <form onSubmit={handleReclubUrlImport} className="space-y-2">
                    <textarea
                      id="reclub-raw-html-input"
                      placeholder="Tempelkan seluruh kode sumber atau teks script Nuxt di sini..."
                      value={rawHtmlText}
                      onChange={(e) => setRawHtmlText(e.target.value)}
                      disabled={isReclubLoading}
                      rows={4}
                      className="w-full bg-slate-950/85 border border-slate-850 rounded-xl px-2.5 py-2 text-[10.5px] text-white placeholder-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-all font-mono"
                    />
                    <button
                      id="btn-reclub-sync-html"
                      type="submit"
                      disabled={isReclubLoading || !rawHtmlText.trim()}
                      className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 text-[10px] font-black py-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer uppercase tracking-wider font-display"
                    >
                      {isReclubLoading ? 'Mengekstrak roster...' : 'Ekstrak Roster Atlet'}
                    </button>
                  </form>
                </>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseRawHtml(!useRawHtml);
                    setReclubUrlError(null);
                  }}
                  className="text-[10px] text-teal-400 hover:text-teal-300 font-extrabold tracking-wide uppercase hover:underline"
                >
                  {useRawHtml ? "← Gunakan Link URL Otomatis" : "⚠️ Link Error? Gunakan Metode Paste HTML"}
                </button>
              </div>

              {/* Reclub Loading State */}
              {isReclubLoading && (
                <div className="flex flex-col items-center gap-2 p-3 bg-slate-950/65 border border-slate-850 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-teal-400 font-bold">
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(20, 184, 166, 0.2)',
                      borderTopColor: '#14b8a6',
                      borderRadius: '50%',
                    }} className="animate-spin" />
                    <span>Mengekstrak roster atlet Reclub...</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {reclubUrlError && (
                <div className="p-2.5 rounded-xl bg-rose-950/15 border border-rose-500/25 text-[10.5px] text-rose-300 font-medium leading-relaxed">
                  ⚠️ {reclubUrlError}
                  {!useRawHtml && (
                    <div className="mt-2.5 pt-2 border-t border-rose-500/10 text-[9.5px] text-rose-400">
                      <b>Mengapa ini terjadi?</b> Server Reclub diproteksi oleh <b>Cloudflare</b> yang memblokir semua request otomatis dari server cloud hosting (baik server AI Studio maupun deployment <b>Vercel</b> Anda).
                      <br/><br/>
                      <b>Solusi 100% Berhasil:</b> Silakan klik tombol kuning <span className="text-teal-400 font-bold hover:underline cursor-pointer" onClick={() => setUseRawHtml(true)}>"⚠️ Link Error? Gunakan Metode Paste HTML"</span> di atas! Cukup salin (Copy) kode sumber halaman Reclub Anda lalu tempel (Paste) di sini. Sangat mudah, instan, dan bebas blokir keamanan!
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {reclubUrlSuccess && (
                <div className="p-2.5 rounded-xl bg-teal-950/15 border border-teal-500/20 text-[10.5px] text-teal-300 font-medium leading-relaxed">
                  ✅ {reclubUrlSuccess}
                </div>
              )}
            </div>
          )}

          {/* 2. SCREENSHOT IMPORTER (AI SCANNER) */}
          {importMethod === 'screenshot' && (
            <div className="space-y-3.5">
              <p className="text-[10.5px] text-[#94A3B8] font-medium leading-relaxed">
                Silakan unggah screenshot halaman <b>Participants (CONFIRMED)</b> dari Reclub untuk pendaftaran instan bertenaga <b>Gemini Vision AI</b>!
              </p>

              <label
                htmlFor="reclub-ss-uploader-sidebar"
                className={`flex flex-col items-center justify-center gap-3 px-4 py-6 rounded-2xl cursor-pointer transition-all duration-200 group text-center border border-dashed ${
                  isAiRegistering
                    ? 'bg-teal-950/10 border-teal-500/40 pointer-events-none'
                    : 'bg-slate-950/60 hover:bg-slate-950/90 border-slate-800 hover:border-teal-500/50'
                }`}
              >
                <Upload className={`w-5 h-5 text-teal-400 opacity-80 group-hover:scale-110 transition-transform ${isAiRegistering ? 'animate-bounce' : ''}`} />
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-teal-400 block transition-colors leading-normal font-sans">
                    {isAiRegistering ? 'Memindai Screenshot...' : 'Pilih/Unggah Screenshot'}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    PNG, JPG, JPEG, WEBP
                  </span>
                </div>
                <input
                  id="reclub-ss-uploader-sidebar"
                  type="file"
                  accept="image/*"
                  onChange={handleReclubImageUpload}
                  disabled={isAiRegistering}
                  className="hidden"
                />
              </label>

              {/* Scanning animation with spinning tennis ball logo */}
              {isAiRegistering && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '1rem', backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '1.2rem', marginTop: '0.5rem' }}>
                  <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                    <div style={{ position: 'absolute', inset: '-6px', background: 'rgba(20, 184, 166, 0.15)', filter: 'blur(8px)', borderRadius: '9999px' }}></div>
                    <div style={{ width: '100%', height: '100%', borderRadius: '9999px', background: 'linear-gradient(135deg, #14b8a6, #2dd4bf)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px -3px rgba(20, 184, 166, 0.3)', animation: 'spinTennisBall 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#020617" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M6.2 6.2C8.2 10 8.2 14 6.2 17.8"></path>
                        <path d="M17.8 6.2C15.8 10 15.8 14 17.8 17.8"></path>
                      </svg>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mengekstrak Atlet</h5>
                    <p style={{ fontSize: '9px', color: '#94a3b8', margin: '2px 0 0 0' }}>Sistem Visi Gemini AI</p>
                  </div>

                  {/* Percentage Counter Indicator */}
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '180px', fontSize: '9px', fontWeight: 'bold', color: '#2dd4bf', marginTop: '0.2rem' }}>
                    <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{scanStatusText}</span>
                    <span>{scanProgress}%</span>
                  </div>

                  {/* Elegant glowing loading bar styled with exact dynamic widths */}
                  <div style={{ width: '100%', maxWidth: '180px', height: '5px', backgroundColor: '#0f172a', borderRadius: '9999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #14b8a6, #2dd4bf)', borderRadius: '9999px', width: `${scanProgress}%`, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {aiError && (
                <div className="p-2.5 rounded-xl bg-rose-950/15 border border-rose-500/20 text-[10.5px] text-rose-300 font-medium leading-relaxed animate-shake">
                  ⚠️ {aiError}
                </div>
              )}
            </div>
          )}

          {/* 3. EXCEL OFFLINE IMPORTER */}
          {importMethod === 'excel' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 border border-slate-850/80 rounded-2xl text-center space-y-2">
                <p className="text-[11px] text-[#94A3B8] font-medium leading-normal">Unduh berkas template Excel luring dahulu:</p>
                <button
                  id="btn-download-template"
                  type="button"
                  onClick={downloadPlayerTemplate}
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-teal-400 hover:text-teal-350 transition-colors uppercase tracking-widest font-display cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Excel Template
                </button>
              </div>

              {onExcelUpload && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-400 font-medium text-center">Silakan unggah setelah mengisi data atlet:</p>
                  <label
                    htmlFor="excel-uploader-sidebar"
                    className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-slate-950/60 hover:bg-slate-950/90 border border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl cursor-pointer transition-all duration-200 group text-center"
                  >
                    <Upload className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-teal-400 block transition-colors leading-normal font-sans">
                        Pilih / Unggah Berkas Excel
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
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
          )}
        </div>
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
