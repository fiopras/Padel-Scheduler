import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Search, Filter, Camera, Download } from 'lucide-react';
import { Player } from '../types';
import html2canvas from 'html2canvas';

function oklchToRgb(l: number, c: number, h: number, alpha: number = 1): string {
  // Convert OKLCH to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab to LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  // LMS to Linear RGB
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  // Linear LMS to Linear RGB
  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Linear RGB to sRGB
  const toSRGB = (x: number) => {
    if (x <= 0.0031308) {
      return 12.92 * x;
    }
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const rVal = Math.round(Math.min(1, Math.max(0, toSRGB(rL))) * 255);
  const gVal = Math.round(Math.min(1, Math.max(0, toSRGB(gL))) * 255);
  const bVal = Math.round(Math.min(1, Math.max(0, toSRGB(bL))) * 255);

  if (alpha === 1) {
    return `rgb(${rVal}, ${gVal}, ${bVal})`;
  } else {
    return `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`;
  }
}

function replaceOklchWithRgb(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.toLowerCase().includes('oklch') && !str.toLowerCase().includes('oklab')) {
    return str;
  }

  return str.replace(/(oklch|oklab)\s*\(([^)]+)\)/gi, (match, type, content) => {
    try {
      const normalizedContent = content.trim().replace(/\s+/g, ' ');
      const parts = normalizedContent.split(/[\s,/\s]+/).filter(Boolean);
      if (parts.length < 3) return match;

      const lStr = parts[0];
      const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);

      const cStr = parts[1];
      const c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);

      const hStr = parts[2];
      const h = hStr.endsWith('%') ? parseFloat(hStr) / 100 : hStr.toLowerCase() === 'none' ? 0 : parseFloat(hStr);

      let alpha = 1;
      if (parts.length >= 4) {
        const aStr = parts[3];
        if (aStr && !aStr.includes('var')) {
          const parsedAlpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
          if (!isNaN(parsedAlpha)) {
            alpha = parsedAlpha;
          }
        }
      }

      if (isNaN(l) || isNaN(c) || isNaN(h)) {
        return match;
      }

      if (type.toLowerCase() === 'oklab') {
        const l_ = l + 0.3963377774 * c + 0.2158037573 * h;
        const m_ = l - 0.1055613458 * c - 0.0638541728 * h;
        const s_ = l - 0.0894841775 * c - 1.2914855480 * h;

        const l3 = l_ * l_ * l_;
        const m3 = m_ * m_ * m_;
        const s3 = s_ * s_ * s_;

        const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
        const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
        const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

        const toSRGB = (x: number) => {
          if (x <= 0.0031308) return 12.92 * x;
          return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        };

        const r = Math.round(Math.min(1, Math.max(0, toSRGB(rL))) * 255);
        const g = Math.round(Math.min(1, Math.max(0, toSRGB(gL))) * 255);
        const b = Math.round(Math.min(1, Math.max(0, toSRGB(bL))) * 255);

        return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        return oklchToRgb(l, c, h, alpha);
      }
    } catch (e) {
      return match;
    }
  });
}

interface LeaderboardPodiumProps {
  leaderboard: Player[];
  eventName?: string;
}

export default function LeaderboardPodium({ leaderboard, eventName }: LeaderboardPodiumProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [genderFilter, setGenderFilter] = React.useState<string>('All');
  const [skillFilter, setSkillFilter] = React.useState<string>('All');
  const [isCapturing, setIsCapturing] = React.useState<string | null>(null);

  // Filter the stats
  const filteredLeaderboard = leaderboard.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
    const matchesSkill = skillFilter === 'All' || p.skillLevel === skillFilter;
    return matchesSearch && matchesGender && matchesSkill;
  });

  const handleCapture = async (targetId: string, filenameSuffix: string, typeName: string) => {
    setIsCapturing(targetId);
    // Give browser a split second to repaint if needed
    await new Promise((resolve) => setTimeout(resolve, 300));
    const element = document.getElementById(targetId);
    if (!element) {
      setIsCapturing(null);
      return;
    }

    const isLight = document.body.classList.contains('light-theme');
    const solidBg = isLight ? '#faf8f5' : '#040814';
    const cardBg = isLight ? '#ffffff' : '#121b2e';
    const textPrimary = isLight ? '#0f172a' : '#ffffff';
    const textSecondary = isLight ? '#475569' : '#94a3b8';
    const borderColor = isLight ? '#e2e8f0' : '#1e293b';

    // Intercept computed styles globally to filter out any oklch/oklab colors which cause html2canvas parser crashes
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (el, pseudoElt) {
      const style = originalGetComputedStyle.call(this, el, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          const val = target[prop as keyof CSSStyleDeclaration];
          if (typeof val === 'string') {
            return replaceOklchWithRgb(val);
          }
          if (typeof val === 'function') {
            return function (...args: any[]) {
              const res = (val as Function).apply(target, args);
              if (typeof res === 'string') {
                return replaceOklchWithRgb(res);
              }
              return res;
            };
          }
          return val;
        },
      });
    };

    try {
      // Execute capture with double scale for crystal clear output
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: solidBg,
        logging: false,
        onclone: (clonedDoc) => {
          // 1. Inject override style rules globally to disable any transitions, animations, backdrop filters, or scaling and letter-spacing bugs
          try {
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * {
                transition: none !important;
                transition-property: none !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
                animation: none !important;
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                text-shadow: none !important;
                filter: none !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          } catch (styleErr) {
            console.error('Error injecting override styles:', styleErr);
          }

          const clonedEl = clonedDoc.getElementById(targetId);
          if (clonedEl) {
            clonedEl.style.borderRadius = '32px';
            clonedEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
            clonedEl.style.color = textPrimary;
            clonedEl.style.border = `1px solid ${borderColor}`;

            // Make sure the capture width is perfect and standardized to avoid squished/clipped responsive layouts
            if (targetId === 'cotta-leaderboard-capture-workspace') {
              clonedEl.style.width = '1200px';
              clonedEl.style.minWidth = '1200px';
              clonedEl.style.maxWidth = '1200px';
              clonedEl.style.padding = '40px';
              clonedEl.style.backgroundColor = solidBg;
            } else if (targetId === 'leaderboard-table-container') {
              clonedEl.style.width = '1200px';
              clonedEl.style.minWidth = '1200px';
              clonedEl.style.maxWidth = '1200px';
              clonedEl.style.padding = '32px';
              clonedEl.style.backgroundColor = cardBg;
            } else if (targetId === 'leaderboard-podium-container') {
              clonedEl.style.width = '1000px';
              clonedEl.style.minWidth = '1000px';
              clonedEl.style.maxWidth = '1000px';
              clonedEl.style.padding = '40px 32px';
              clonedEl.style.backgroundColor = cardBg;
            }

            // Let the podium circular columns expand beautifully on wider posters to fill negative space elegantly
            const flexPodiums = clonedEl.querySelectorAll('.flex.items-end.justify-center');
            flexPodiums.forEach((fp) => {
              const el = fp as HTMLElement;
              el.style.maxWidth = '850px';
              el.style.width = '100%';
              el.style.margin = '0 auto';
              el.style.gap = '24px';
            });

            // Remove internal scrolling or hidden boxes
            const overflowContainers = clonedEl.querySelectorAll('.overflow-x-auto, .overflow-y-auto');
            overflowContainers.forEach((c) => {
              const el = c as HTMLElement;
              el.style.overflow = 'visible';
              el.style.overflowX = 'visible';
              el.style.overflowY = 'visible';
              el.style.maxWidth = 'none';
              el.style.width = '100%';
            });

            // Format tables for perfect high resolution render layout
            const tables = clonedEl.querySelectorAll('table');
            tables.forEach((t) => {
              const table = t as HTMLElement;
              table.style.width = '100%';
              table.style.minWidth = '100%';
              table.style.tableLayout = 'fixed';
              table.style.borderCollapse = 'collapse';
            });

            // Format table cells for absolute alignment and spacing
            const rowCells = clonedEl.querySelectorAll('td, th');
            rowCells.forEach((cell) => {
              const c = cell as HTMLElement;
              c.style.whiteSpace = 'nowrap';
              c.style.overflow = 'hidden';
              c.style.textOverflow = 'ellipsis';
              c.style.borderBottom = `1px solid ${borderColor}`;
              c.style.verticalAlign = 'middle';
            });

            // Unify cell widths across all table rows to guarantee pixel-perfect column alignment
            const rows = clonedEl.querySelectorAll('tr');
            rows.forEach((row) => {
              const cells = row.querySelectorAll('th, td');
              if (cells.length === 10) {
                const widths = ['80px', '220px', '110px', '140px', '80px', '90px', '90px', '110px', '110px', '100px'];
                cells.forEach((cell, i) => {
                  if (widths[i]) {
                    const c = cell as HTMLElement;
                    c.style.width = widths[i];
                    c.style.minWidth = widths[i];
                    c.style.maxWidth = widths[i];
                    
                    // Extra padding and border refinement for headers
                    if (c.tagName.toLowerCase() === 'th') {
                      c.style.paddingTop = '16px';
                      c.style.paddingBottom = '16px';
                      c.style.borderBottom = `2px solid ${borderColor}`;
                    }
                  }
                });
              }
            });

            // Ensure light/dark classes render correctly nested styles in the clone
            if (isLight) {
              clonedEl.classList.add('light-theme');
              clonedEl.classList.remove('dark');
            } else {
              clonedEl.classList.remove('light-theme');
              clonedEl.classList.add('dark');
            }
          }

          // Convert oklch/oklab values inside <style> elements using our high-fidelity converter
          try {
            const styleElements = clonedDoc.querySelectorAll('style');
            styleElements.forEach((style) => {
              if (style.textContent) {
                style.textContent = replaceOklchWithRgb(style.textContent);
              }
            });
          } catch (styleErr) {
            console.error('Error rewriting style elements:', styleErr);
          }

          // Polyfill computedStyle inside cloned context to convert oklch value lookups dynamically too
          try {
            if (clonedDoc.defaultView) {
              const cloneGetComputedStyle = clonedDoc.defaultView.getComputedStyle;
              clonedDoc.defaultView.getComputedStyle = function (el, pseudoElt) {
                const style = cloneGetComputedStyle.call(this, el, pseudoElt);
                return new Proxy(style, {
                  get(target, prop) {
                    const val = target[prop as keyof CSSStyleDeclaration];
                    if (typeof val === 'string') {
                      return replaceOklchWithRgb(val);
                    }
                    if (typeof val === 'function') {
                      return function (...args: any[]) {
                        const res = (val as Function).apply(target, args);
                        if (typeof res === 'string') {
                          return replaceOklchWithRgb(res);
                        }
                        return res;
                      };
                    }
                    return val;
                  },
                });
              };
            }
          } catch (proxyErr) {
            console.error('Error setting up computedStyle proxy in clone:', proxyErr);
          }
        },
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cleanEventName = (eventName || 'Sirkuit_Cotta').replace(/\s+/g, '_');
      const dateString = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\s+/g, '_');
      
      link.download = `Klasemen_${cleanEventName}_${filenameSuffix}_${dateString}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Failed to capture:', err);
    } finally {
      // Restore original getComputedStyle immediately!
      window.getComputedStyle = originalGetComputedStyle;
      setIsCapturing(null);
    }
  };

  // Podium slots
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  return (
    <div id="cotta-leaderboard-capture-workspace" className="space-y-8">
      {/* Premium Capture Control Center */}
      <div data-html2canvas-ignore className="p-4 sm:p-5 bg-gradient-to-r from-teal-500/10 to-teal-400/5 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-500/20 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse animate-duration-1000" />
            <h4 className="text-xs font-black text-teal-650 dark:text-teal-450 uppercase tracking-widest font-display flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Capture Poster Klasemen
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Sirkuit selesai! Simpan rekap klasemen & podium interaktif berskala HD (PNG) untuk dibagikan ke WhatsApp Group atlet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {/* Button 1: Podium Poster */}
          {leaderboard.length >= 2 && (
            <button
              onClick={() => handleCapture('leaderboard-podium-container', 'Podium', 'Podium')}
              disabled={!!isCapturing}
              className="px-3.5 py-1.5 hover:scale-[1.02] active:scale-95 bg-teal-500/10 hover:bg-teal-555 hover:text-white dark:hover:bg-teal-600 border border-teal-500/20 text-teal-600 dark:text-teal-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCapturing === 'leaderboard-podium-container' ? (
                <span className="inline-block w-3 h-3 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Podium
            </button>
          )}

          {/* Button 2: Standings Table */}
          <button
            onClick={() => handleCapture('leaderboard-table-container', 'Tabel_Klasemen', 'Tabel')}
            disabled={!!isCapturing}
            className="px-3.5 py-1.5 hover:scale-[1.02] active:scale-95 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isCapturing === 'leaderboard-table-container' ? (
              <span className="inline-block w-3 h-3 border-2 border-slate-500/30 border-t-slate-550 rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Tabel Klasemen
          </button>

          {/* Button 3: Full Poster Combo */}
          <button
            onClick={() => handleCapture('cotta-leaderboard-capture-workspace', 'Rekap_Lengkap', 'Snapshot')}
            disabled={!!isCapturing}
            className="px-3.5 py-1.5 hover:scale-[1.02] active:scale-95 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-none rounded-xl text-[11px] font-black tracking-wide transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/10 disabled:opacity-50"
          >
            {isCapturing === 'cotta-leaderboard-capture-workspace' ? (
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            Ambil Rekap Lengkap (Poster HD)
          </button>
        </div>
      </div>

      {/* 3D Premium Athletic Podium */}
      {leaderboard.length >= 2 && (
        <div id="leaderboard-podium-container" className="pt-8 pb-6 px-6 bg-[#121B2E]/45 border border-slate-850/80 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center backdrop-blur-md">
          {/* Subtle decoration lines inside podium container */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500/0 via-teal-400 to-amber-500/0 opacity-40 animate-pulse" />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-8">
            <span className="px-3.5 py-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full uppercase tracking-widest font-display">
              Top Performance Athletes
            </span>
            <h2 className="text-2xl font-black text-white mt-2 font-display tracking-tight uppercase">Podium Klasemen</h2>
          </div>

          <div className="flex items-end justify-center w-full max-w-sm sm:max-w-lg h-56 sm:h-60 mt-4 gap-2 sm:gap-4 md:gap-5">
            {/* 2nd Place: Silver */}
            {second && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-center flex-1 group min-w-0"
              >
                <div className="relative mb-2">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-100 dark:bg-slate-900 rounded-full border-2 border-slate-405 flex items-center justify-center text-slate-800 dark:text-white font-extrabold text-xs sm:text-base shadow-xl group-hover:scale-105 transition-all duration-350">
                    {second.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -top-1 -right-1 bg-slate-300 dark:bg-slate-350 text-slate-950 font-black text-[9px] sm:text-[11px] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border border-white dark:border-slate-950 shadow-md">
                    2
                  </span>
                </div>
                <div className="text-center mb-1 max-w-[75px] sm:max-w-28 leading-tight min-w-0 w-full px-1">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-sans" title={second.name}>{second.name}</p>
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono mt-0.5">{second.points} PTS</p>
                </div>
                <div className="w-full h-18 sm:h-24 bg-gradient-to-t from-slate-100 to-slate-200/60 dark:from-slate-900 dark:to-slate-850 border border-slate-250 dark:border-slate-700/60 rounded-t-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-slate-400 opacity-80" />
                  <span className="text-xl sm:text-3xl font-black text-slate-550 dark:text-slate-400 font-display">2ND</span>
                  <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-[#708090] dark:text-[#94A3B8] uppercase mt-0.5">Silver</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place: Gold */}
            {first && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-center flex-1 group min-w-0"
              >
                <div className="relative mb-2">
                  <div className="w-13 h-13 sm:w-18 sm:h-18 bg-amber-50 dark:bg-[#1e1b12] rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-800 dark:text-white font-extrabold text-sm sm:text-lg shadow-2xl ring-2 sm:ring-4 ring-amber-405/20 dark:ring-amber-400/15 group-hover:scale-105 transition-all duration-350">
                    {first.name.substring(0, 2).toUpperCase()}
                  </div>
                  <motion.span
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[10px] sm:text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-950"
                  >
                    👑
                  </motion.span>
                </div>
                <div className="text-center mb-1 max-w-[85px] sm:max-w-32 leading-tight min-w-0 w-full px-1">
                  <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate font-sans" title={first.name}>{first.name}</p>
                  <p className="text-[10px] sm:text-xs font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{first.points} PTS</p>
                </div>
                <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-amber-50 to-amber-100/70 dark:from-[#1e1c12] dark:to-[#2e2b1d] border border-amber-400/35 dark:border-amber-500/30 rounded-t-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-md" />
                  <span className="text-2xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 font-display">1ST</span>
                  <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-amber-700 dark:text-amber-400 uppercase mt-0.5 font-display">Champion</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place: Bronze */}
            {third && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col items-center flex-1 group min-w-0"
              >
                <div className="relative mb-2">
                  <div className="w-9 h-9 sm:w-13 sm:h-13 bg-orange-50 dark:bg-slate-900 rounded-full border-2 border-orange-400 flex items-center justify-center text-orange-800 dark:text-white font-extrabold text-xs sm:text-base shadow-xl group-hover:scale-105 transition-all duration-350">
                    {third.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white font-black text-[9px] sm:text-[11px] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border border-white dark:border-slate-950 shadow-md">
                    3
                  </span>
                </div>
                <div className="text-center mb-1 max-w-[70px] sm:max-w-28 leading-tight min-w-0 w-full px-1">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-sans" title={third.name}>{third.name}</p>
                  <p className="text-[9px] sm:text-[10px] font-black text-orange-600 dark:text-slate-405 font-mono mt-0.5">{third.points} PTS</p>
                </div>
                <div className="w-full h-14 sm:h-18 bg-gradient-to-t from-orange-50 to-orange-100/50 dark:from-slate-900 dark:to-slate-850 border border-orange-250 dark:border-slate-700/60 rounded-t-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-orange-450 opacity-80" />
                  <span className="text-lg sm:text-2xl font-black text-orange-600 dark:text-orange-500 font-display">3RD</span>
                  <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase mt-0.5">Bronze</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table Workspace */}
      <div id="leaderboard-table-container" className="bg-white dark:bg-[#121B2E]/40 rounded-3xl border border-slate-205 dark:border-slate-800/80 overflow-hidden backdrop-blur-md shadow-sm dark:shadow-none">
        {/* Table Filters Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display uppercase tracking-tight">
              <Trophy className="w-5 h-5 text-amber-550" />
              Klasemen Klasifikasi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Peringkat atlet berdasarkan poin, selisih game, dan rasio kemenangan.</p>
          </div>

          <div data-html2canvas-ignore className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                id="search-player-leaderboard"
                type="text"
                placeholder="Cari atlet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-48 bg-slate-50 dark:bg-slate-950/80 border border-slate-250 dark:border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* Gender Filter */}
            <select
              id="filter-gender-leaderboard"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-250 dark:border-slate-800 focus:border-teal-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-white focus:outline-none transition-all"
            >
              <option value="All">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            {/* Skill Filter */}
            <select
              id="filter-skill-leaderboard"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-250 dark:border-slate-800 focus:border-teal-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-white focus:outline-none transition-all"
            >
              <option value="All">Semua Skill</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-widest border-b border-slate-150 dark:border-slate-800/80 font-display">
                <th className="py-4 px-4 text-center">Rank</th>
                <th className="py-4 px-4">Nama Athlete</th>
                <th className="py-4 px-4 text-center">Gender</th>
                <th className="py-4 px-4">Skill Level</th>
                <th className="py-4 px-4 text-center">Main</th>
                <th className="py-4 px-4 text-center">Menang</th>
                <th className="py-4 px-4 text-center">Kalah</th>
                <th className="py-4 px-4 text-center">Win Rate</th>
                <th className="py-4 px-4 text-center">Game Diff</th>
                <th className="py-4 px-4 text-right pr-6">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans font-medium">
                    Belum ada data atlet yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((player, index) => {
                  // Find original rank based on index in total sorted leaderboard
                  const originalRank = leaderboard.findIndex((p) => p.id === player.id) + 1;

                  // Rank Badge Render
                  let rankBadge = `${originalRank}`;
                  if (originalRank === 1) rankBadge = '🥇';
                  else if (originalRank === 2) rankBadge = '🥈';
                  else if (originalRank === 3) rankBadge = '🥉';

                  const diff = player.gamesWon - player.gamesLost;

                  return (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-805/30 transition-all duration-150 text-slate-650 dark:text-slate-300 group"
                    >
                      <td className="py-4 px-4 font-black text-center text-sm w-16">
                        <span className={originalRank <= 3 ? 'text-lg' : 'text-slate-400 dark:text-slate-500 font-bold font-mono'}>
                          {rankBadge}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white group-hover:text-teal-550 dark:group-hover:text-teal-400 transition-colors">
                        {player.name}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-350">
                          {player.gender}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            player.skillLevel === 'Advanced'
                              ? 'bg-amber-500 shadow-md shadow-amber-500/20'
                              : player.skillLevel === 'Intermediate'
                              ? 'bg-teal-405 shadow-md shadow-teal-500/20'
                              : 'bg-slate-550'
                          }`}
                        />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{player.skillLevel}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-medium">{player.matchesPlayed}</td>
                      <td className="py-4 px-4 text-center font-bold text-teal-605 dark:text-teal-400 font-mono">
                        {player.matchesWon}
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-slate-450 dark:text-slate-500 font-mono">
                        {player.matchesLost}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{player.winRate}%</span>
                          <div className="w-12 bg-slate-200 dark:bg-slate-900 h-1 rounded-full mt-1.5 overflow-hidden font-sans">
                            <div
                              className="bg-gradient-to-r from-teal-555 to-teal-400 dark:from-teal-500 dark:to-teal-400 h-full rounded-full"
                              style={{ width: `${player.winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        <span className={diff > 0 ? 'text-teal-605 dark:text-teal-400 font-bold' : diff < 0 ? 'text-rose-500 font-semibold' : 'text-slate-405'}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                        <span className="text-[9px] text-slate-450 dark:text-slate-500 ml-1 font-sans font-semibold">({player.gamesWon}:{player.gamesLost})</span>
                      </td>
                      <td className="py-4 px-4 text-right pr-6 font-extrabold text-amber-600 dark:text-amber-500 text-sm font-mono">
                        {player.points}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
