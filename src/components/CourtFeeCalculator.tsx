import React, { useState, useEffect } from 'react';
import { Calculator, Coins, Users, CheckCircle, RefreshCw, UserCheck, ShieldAlert, AlertCircle, Plus, Info } from 'lucide-react';
import { Player } from '../types';

interface CourtFeeCalculatorProps {
  players: Player[];
}

export default function CourtFeeCalculator({ players }: CourtFeeCalculatorProps) {
  // Calculator Modes
  // 'single' = Normal calculations
  // 'dual' = Split session (e.g. regular session vs overtime session)
  const [calcType, setCalcType] = useState<'single' | 'dual'>('single');
  const [calcMode, setCalcMode] = useState<'split' | 'multiply'>('split');
  
  // Single Session State
  const [useRosterCount, setUseRosterCount] = useState<boolean>(true);
  const [customPlayerCount, setCustomPlayerCount] = useState<number>(14);
  const actualPlayerCount = useRosterCount ? Math.max(1, players.length) : Math.max(1, customPlayerCount);

  const [courtFeeInput, setCourtFeeInput] = useState<string>('2345000'); 
  const [shuttlecockFeeInput, setShuttlecockFeeInput] = useState<string>('0');
  const [individualRateInput, setIndividualRateInput] = useState<string>('99000'); 
  const [rounding, setRounding] = useState<number>(1000); // round up to nearest 1000 by default

  // Dual Session (Sesion Split / Overtime) State
  const [mainFeeInput, setMainFeeInput] = useState<string>('1386000'); // 2 Hours Main Session cost
  const [mainPlayerCount, setMainPlayerCount] = useState<number>(14);
  
  const [extraFeeInput, setExtraFeeInput] = useState<string>('959005');  // 1 Hour Overtime cost (so total is roughly 2.34M)
  const [extraPlayerCount, setExtraPlayerCount] = useState<number>(5);

  // Track player specific settings when roster is used
  // paidPlayers: { [playerId]: true/false }
  const [paidPlayers, setPaidPlayers] = useState<Record<string, boolean>>({});
  // playerSessAttendance: { [playerId]: 'main' | 'both' }
  const [playerSessAttendance, setPlayerSessAttendance] = useState<Record<string, 'main' | 'both'>>({});

  // Reset or initialize player states when roster changes
  useEffect(() => {
    const initialPaid: Record<string, boolean> = {};
    const initialAttendance: Record<string, 'main' | 'both'> = {};
    
    players.forEach((p, index) => {
      initialPaid[p.id] = false;
      // Synthesize some default participants for overtime as a helper (first 5 players attend overtime, rest main only)
      initialAttendance[p.id] = index < 5 ? 'both' : 'main';
    });
    
    setPaidPlayers(initialPaid);
    setPlayerSessAttendance(initialAttendance);
  }, [players]);

  // Read numeric values safely
  const courtFee = parseFloat(courtFeeInput) || 0;
  const shuttlecockFee = parseFloat(shuttlecockFeeInput) || 0;
  const rawTotalFee = courtFee + shuttlecockFee;
  const individualRateValue = parseFloat(individualRateInput) || 0;

  const mainFee = parseFloat(mainFeeInput) || 0;
  const extraFee = parseFloat(extraFeeInput) || 0;

  // Sync count of roster players who are marked as attending both sessions
  const rosterMainOnlyCount = players.filter(p => playerSessAttendance[p.id] === 'main').length;
  const rosterBothCount = players.filter(p => playerSessAttendance[p.id] === 'both').length;

  const finalMainPlayersCount = useRosterCount ? players.length : Math.max(1, mainPlayerCount);
  const finalExtraPlayersCount = useRosterCount ? rosterBothCount : Math.max(1, extraPlayerCount);

  // Formatting Currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // String numeric layout
  const formatSeparator = (val: string) => {
    const cleanNum = val.replace(/\D/g, '');
    if (!cleanNum) return '';
    return parseInt(cleanNum, 10).toLocaleString('id-ID');
  };

  const handleMoneyChange = (val: string, setter: (s: string) => void) => {
    const digitsOnly = val.replace(/\D/g, '');
    setter(digitsOnly);
  };

  // SINGLE SESSION CALCULATIONS
  let singleTotalCost = 0;
  let singleIndividualShare = 0;

  if (calcMode === 'split') {
    singleTotalCost = rawTotalFee;
    const rawShare = singleTotalCost / actualPlayerCount;
    if (rounding > 1) {
      singleIndividualShare = Math.ceil(rawShare / rounding) * rounding;
    } else {
      singleIndividualShare = Math.round(rawShare);
    }
  } else {
    singleIndividualShare = individualRateValue;
    singleTotalCost = individualRateValue * actualPlayerCount;
  }

  // DUAL SESSION CALCULATIONS
  // Share Utama = Biaya Sesi Utama / Jumlah Pemain Utama
  const rawMainShare = mainFee / finalMainPlayersCount;
  let finalMainShare = 0;
  if (rounding > 1) {
    finalMainShare = Math.ceil(rawMainShare / rounding) * rounding;
  } else {
    finalMainShare = Math.round(rawMainShare);
  }

  // Share Tambahan = Biaya Sesi Tambahan / Jumlah Pemain Overtime
  const rawExtraShare = finalExtraPlayersCount > 0 ? (extraFee / finalExtraPlayersCount) : 0;
  let finalExtraShare = 0;
  if (finalExtraPlayersCount > 0) {
    if (rounding > 1) {
      finalExtraShare = Math.ceil(rawExtraShare / rounding) * rounding;
    } else {
      finalExtraShare = Math.round(rawExtraShare);
    }
  }

  // Pre-configured Scenarios
  const loadScenario = (type: 'scenario-1' | 'scenario-2' | 'scenario-split') => {
    if (type === 'scenario-1') {
      setCalcType('single');
      setCalcMode('multiply');
      setUseRosterCount(false);
      setCustomPlayerCount(14);
      setIndividualRateInput('99000');
    } else if (type === 'scenario-2') {
      setCalcType('single');
      setCalcMode('split');
      setUseRosterCount(false);
      setCustomPlayerCount(14);
      setCourtFeeInput('2345000');
      setShuttlecockFeeInput('0');
      setRounding(100);
    } else if (type === 'scenario-split') {
      setCalcType('dual');
      setUseRosterCount(false);
      setMainFeeInput('1386000');
      setMainPlayerCount(14);
      setExtraFeeInput('959000');
      setExtraPlayerCount(5);
      setRounding(1000);
    }
  };

  // Helper payment utilities
  const togglePaid = (playerId: string) => {
    setPaidPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  const toggleAttendance = (playerId: string) => {
    setPlayerSessAttendance(prev => ({
      ...prev,
      [playerId]: prev[playerId] === 'main' ? 'both' : 'main'
    }));
  };

  const getPlayerOwed = (playerId: string) => {
    if (calcType === 'single') {
      return singleIndividualShare;
    } else {
      const attendance = playerSessAttendance[playerId] || 'main';
      return attendance === 'both' ? (finalMainShare + finalExtraShare) : finalMainShare;
    }
  };

  // Metrics for collected roster payments
  const totalRosterCount = players.length;
  const trackedPaidList = players.filter(p => paidPlayers[p.id]);
  const trackedPaidCount = trackedPaidList.length;

  const totalTrackedOwedSum = players.reduce((acc, p) => acc + getPlayerOwed(p.id), 0);
  const totalTrackedCollected = players.reduce((acc, p) => acc + (paidPlayers[p.id] ? getPlayerOwed(p.id) : 0), 0);
  const totalTrackedRemaining = totalTrackedOwedSum - totalTrackedCollected;

  const markAllPaid = (status: boolean) => {
    const updated: Record<string, boolean> = {};
    players.forEach(p => {
      updated[p.id] = status;
    });
    setPaidPlayers(updated);
  };

  return (
    <div id="court-fee-calculator-panel" className="bg-[#121B2E]/40 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 left-0 w-36 h-36 bg-teal-500/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Main Title Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800/60 pb-5 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wider flex items-center gap-1.5">
              Kelola Iuran & Patungan Sewa
              <span className="text-[9px] bg-teal-500/10 text-teal-400 py-0.5 px-2 rounded-full border border-teal-500/10 font-bold uppercase tracking-wider font-mono">
                Rupiah (IDR)
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Bagi rata pengeluaran sewa lapangan secara dinamis, termasuk case lembur jam tambahan dengan peserta berbeda.</p>
          </div>
        </div>

        {/* Action Quick Scenarios */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/40 p-2 rounded-xl border border-slate-850">
          <span className="text-[9px] text-[#94A3B8] font-bold tracking-widest uppercase font-mono mr-1.5">Simulasi Kasus:</span>
          <button
            id="preset-scen-1"
            type="button"
            onClick={() => loadScenario('scenario-1')}
            className={`px-2.5 py-1 text-[9px] font-bold rounded-lg font-mono transition-all cursor-pointer ${
              calcType === 'single' && calcMode === 'multiply' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            A. 14 Org × Rp99rb
          </button>
          <button
            id="preset-scen-2"
            type="button"
            onClick={() => loadScenario('scenario-2')}
            className={`px-2.5 py-1 text-[9px] font-bold rounded-lg font-mono transition-all cursor-pointer ${
              calcType === 'single' && calcMode === 'split' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            B. Rp2,34M ÷ 14 Org
          </button>
          <button
            id="preset-scen-split"
            type="button"
            onClick={() => loadScenario('scenario-split')}
            className={`px-2.5 py-1 text-[9px] font-semibold rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1 ${
              calcType === 'dual' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Plus className="w-2.5 h-2.5" /> Nambah Jam (2 Jam + 1 Jam)
          </button>
        </div>
      </div>

      {/* Main Structural Tab Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-2xl border border-slate-850 mb-6 max-w-xl">
        <button
          id="btn-calc-single-tab"
          type="button"
          onClick={() => setCalcType('single')}
          className={`py-3 px-4 rounded-xl text-xs font-black transition-all text-center tracking-wide uppercase font-display flex items-center justify-center gap-2 ${
            calcType === 'single'
              ? 'bg-[#121B2E] text-teal-400 border border-teal-500/20 shadow-md'
              : 'text-slate-400 hover:text-white cursor-pointer'
          }`}
        >
          <Coins className="w-4.5 h-4.5" />
          Regular
        </button>
        <button
          id="btn-calc-overtime-tab"
          type="button"
          onClick={() => setCalcType('dual')}
          className={`py-3 px-4 rounded-xl text-xs font-black transition-all text-center tracking-wide uppercase font-display flex items-center justify-center gap-2 ${
            calcType === 'dual'
              ? 'bg-[#121B2E] text-amber-500 border border-amber-500/25 shadow-md animate-pulse'
              : 'text-slate-400 hover:text-white cursor-pointer'
          }`}
        >
          <Plus className="w-4.5 h-4.5" />
          Nambah Jam
        </button>
      </div>

      {/* Layout Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT: Inputs & Modes */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Active Roster vs Manual Flag */}
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-850/60 space-y-3">
            <label className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
              Konfigurasi Partisipan Sesi
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-white font-semibold select-none cursor-pointer">
                <input
                  type="radio"
                  checked={useRosterCount}
                  onChange={() => setUseRosterCount(true)}
                  className="accent-teal-400 cursor-pointer w-4 h-4"
                />
                Ikuti Roster Aktif ({players.length} Pemain terdaftar)
              </label>
              <label className="flex items-center gap-2 text-xs text-white font-semibold select-none cursor-pointer">
                <input
                  type="radio"
                  checked={!useRosterCount}
                  onChange={() => setUseRosterCount(false)}
                  className="accent-teal-400 cursor-pointer w-4 h-4"
                />
                Isi Jumlah Manual
              </label>
            </div>
            {useRosterCount && (
              <div className="text-[10px] text-slate-450 leading-relaxed font-sans flex items-center gap-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Saat roster aktif digunakan, tagihan per kepala dihitung otomatis dan Anda dapat mengecek status lunas masing-masing pemain di kolom list bawah!</span>
              </div>
            )}
          </div>

          {/* SINGLE SESSION WORKFLOW */}
          {calcType === 'single' && (
            <div className="space-y-4">
              {/* Type Format Sub-Switcher for single session */}
              <div className="bg-slate-950/40 p-1.5 rounded-xl border border-slate-850/60 flex text-xs font-sans">
                <button
                  type="button"
                  onClick={() => setCalcMode('split')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all text-center uppercase text-[10px] tracking-wide cursor-pointer ${
                    calcMode === 'split' ? 'bg-[#121B2E] text-teal-400 border border-teal-500/10' : 'text-slate-400'
                  }`}
                >
                  Bagi Rata (Total Sewa ÷ Jumlah Orang)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('multiply')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all text-center uppercase text-[10px] tracking-wide cursor-pointer ${
                    calcMode === 'multiply' ? 'bg-[#121B2E] text-teal-400 border border-teal-500/10' : 'text-slate-400'
                  }`}
                >
                  Iuran Tetap / Per Orang
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Custom Player count tracker */}
                {!useRosterCount && (
                  <div className="space-y-1.5 bg-slate-950/30 p-4 rounded-xl border border-slate-850/60">
                    <label className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
                      Jumlah Pemain Aktif
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="number"
                        min={1}
                        value={customPlayerCount}
                        onChange={(e) => setCustomPlayerCount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950/90 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-teal-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-financial input based on mode */}
                {calcMode === 'split' ? (
                  <>
                    <div className="space-y-1.5 bg-slate-950/30 p-4 rounded-xl border border-slate-850/60">
                      <label className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
                        Harga Sewa Lapangan
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                        <input
                          id="calc-court-fee-dual"
                          type="text"
                          value={formatSeparator(courtFeeInput)}
                          onChange={(e) => handleMoneyChange(e.target.value, setCourtFeeInput)}
                          placeholder="0"
                          className="w-full bg-slate-950/90 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-teal-400 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-slate-950/30 p-4 rounded-xl border border-slate-850/60">
                      <label className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
                        Bola & Lainnya
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                        <input
                          id="calc-shuttlecock-fee-dual"
                          type="text"
                          value={formatSeparator(shuttlecockFeeInput)}
                          onChange={(e) => handleMoneyChange(e.target.value, setShuttlecockFeeInput)}
                          placeholder="0"
                          className="w-full bg-slate-950/90 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-teal-400 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 bg-slate-950/30 p-4 rounded-xl border border-slate-850/60 col-span-2">
                    <label className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
                      Tarif Iuran Tetap Per Orang
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                      <input
                        id="calc-indiv-fee-dual"
                        type="text"
                        value={formatSeparator(individualRateInput)}
                        onChange={(e) => handleMoneyChange(e.target.value, setIndividualRateInput)}
                        placeholder="0"
                        className="w-full bg-slate-950/90 border border-slate-850 rounded-xl py-2.5 pl-9 pr-4 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-teal-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DUAL SESSION (SPLIT-OVERTIME) WORKFLOW */}
          {calcType === 'dual' && (
            <div className="space-y-4">
              <div className="bg-[#18233C]/40 border border-slate-800 rounded-2xl p-4.5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-teal-500/20" />
                <h4 className="text-xs font-black text-white font-display uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-teal-500 text-slate-950 text-[9px] px-2 py-0.5 rounded font-black font-mono">SESI 1</span>
                  Sesi Regular (Contoh: Main 2 Jam)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-display">
                      Biaya Lapangan Regular
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                      <input
                        id="split-main-fee"
                        type="text"
                        value={formatSeparator(mainFeeInput)}
                        onChange={(e) => handleMoneyChange(e.target.value, setMainFeeInput)}
                        className="w-full bg-slate-950/90 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-teal-400 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {!useRosterCount && (
                    <div className="space-y-1">
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-display">
                        Jumlah Peserta Sesi Regular
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={mainPlayerCount}
                        onChange={(e) => setMainPlayerCount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950/90 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-teal-400 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#2D211F]/30 border border-amber-900/40 rounded-2xl p-4.5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-amber-500/20" />
                <h4 className="text-xs font-black text-white font-display uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-amber-500 text-slate-950 text-[9px] px-2 py-0.5 rounded font-black font-mono">SESI 2</span>
                  Sesi Nambah Jam (Overtime Sesi)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-display">
                      Biaya Lapangan Nambah Jam
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                      <input
                        id="split-extra-fee"
                        type="text"
                        value={formatSeparator(extraFeeInput)}
                        onChange={(e) => handleMoneyChange(e.target.value, setExtraFeeInput)}
                        className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {!useRosterCount && (
                    <div className="space-y-1">
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-display">
                        Jumlah Peserta Nambah Jam
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={extraPlayerCount}
                        onChange={(e) => setExtraPlayerCount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rounding Factor Indicator */}
          <div className="space-y-2.5 bg-slate-950/20 p-4 rounded-2xl border border-slate-850/60">
            <label className="block text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest font-display">
              Presisi Pembulatan Tarif Iuran Ke Atas (Rupiah)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 1, label: 'No Round' },
                { value: 100, label: 'Rp100 Rupiah' },
                { value: 1000, label: 'Rp1.000 Rupiah' },
                { value: 5000, label: 'Rp5.000 Rupiah' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRounding(option.value)}
                  className={`px-1.5 py-2 text-[10px] font-extrabold rounded-xl border transition-all text-center cursor-pointer font-display ${
                    rounding === option.value
                      ? 'bg-[#121B2E] border-teal-500/30 text-teal-400 font-black'
                      : 'bg-slate-950/60 border-slate-850 text-slate-450 hover:border-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Summary / Invoice Card */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-[#121C34]/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex-1 flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold tracking-widest uppercase text-[#94A3B8] font-display">SUMMARY INVOICE PATUNGAN</p>
                <div className="h-0.5 w-12 bg-gradient-to-r from-teal-400 to-teal-450 mt-1 mb-4" />
              </div>

              {calcType === 'single' ? (
                // Single view summary
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-450 font-display flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500" /> Tarif Iuran Per Orang
                    </span>
                    <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                      {formatIDR(singleIndividualShare)}
                      <span className="text-xs font-bold text-[#94A3B8] font-sans ml-1">
                        / orang
                      </span>
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[8px] uppercase font-bold tracking-wider text-slate-500 font-display">Total Kas Utama</span>
                      <p className="text-xs font-black font-mono text-white mt-0.5">
                        {formatIDR(singleTotalCost)}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase font-bold tracking-wider text-slate-500 font-display">Participating</span>
                      <p className="text-xs font-black font-mono text-teal-400 mt-0.5">
                        {actualPlayerCount} Pemain
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Dual session split summary
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Session 1 rate */}
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-teal-400 font-display block">Sesi Regular (Iuran 1)</span>
                        <span className="text-xs text-slate-400 font-mono">Rp{mainFee.toLocaleString('id-ID')} ÷ {finalMainPlayersCount} orang</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-teal-300">{formatIDR(finalMainShare)}</span>
                    </div>

                    {/* Overtime rate */}
                    <div className="p-3 bg-[#1C1613]/50 rounded-xl border border-amber-900/30 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-amber-500 font-display block">Nambah Jam (Iuran Tambahan)</span>
                        <span className="text-xs text-slate-400 font-mono">Rp{extraFee.toLocaleString('id-ID')} ÷ {finalExtraPlayersCount} orang</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-amber-400">{formatIDR(finalExtraShare)}</span>
                    </div>
                  </div>

                  {/* Summary aggregate info */}
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-455 font-medium">
                      <span>Total Biaya Lapangan (Regular + Nambah Jam):</span>
                      <span className="font-mono text-white font-bold">{formatIDR(mainFee + extraFee)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-455 font-medium">
                      <span>Tarif Gabungan (Regular + Nambah Jam):</span>
                      <span className="font-mono text-amber-400 font-extrabold">{formatIDR(finalMainShare + finalExtraShare)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informational Formula */}
              <div className="text-[10px] leading-relaxed text-slate-450 bg-slate-950/30 p-3 rounded-xl border border-slate-900 leading-normal font-mono">
                {calcType === 'single' ? (
                  <>
                    <strong className="text-white">Rumus Tunggal:</strong> (Lapangan Rp{courtFee.toLocaleString('id-ID')} + Bola & Lainnya Rp{shuttlecockFee.toLocaleString('id-ID')}) ÷ {actualPlayerCount} Pemain = {formatIDR(singleTotalCost / actualPlayerCount)} per kepala.
                  </>
                ) : (
                  <>
                    <strong className="text-white font-display uppercase tracking-wider block mb-1">SKEMA SPLIT BILL OVERTIME:</strong>
                    - Pemain yang hanya ikut <span className="text-teal-400 font-bold">Sesi Regular (2 Jam)</span> hanya membayar iuran Regular (<span className="text-white font-bold">{formatIDR(finalMainShare)}</span>).
                    <br />
                    - Pemain yang lanjut <span className="text-amber-500 font-bold">Nambah Jam (3 Jam)</span> membayar Iuran Regular + Nambah Jam (<span className="text-amber-400 font-bold">{formatIDR(finalMainShare + finalExtraShare)}</span>).
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROSTER CHECKLIST: Only render when using Roster input selection */}
      {useRosterCount && players.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-800/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 select-none">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-400 animate-pulse" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-display">
                Catatan Roster Patungan & Keikutsertaan Nambah Jam ({trackedPaidCount} / {totalRosterCount} Pemain Lunas)
              </h4>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAllPaid(true)}
                className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-all cursor-pointer font-display"
              >
                Setel Semua Lunas
              </button>
              <button
                type="button"
                onClick={() => markAllPaid(false)}
                className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer font-display"
              >
                Reset Lunas
              </button>
            </div>
          </div>

          {/* Aggregate Roster financials */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 font-mono">
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
              <span className="block text-[8px] uppercase font-bold text-slate-500">Estimasi Tagihan Roster</span>
              <span className="text-xs font-black text-white">{formatIDR(totalTrackedOwedSum)}</span>
            </div>
            <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-950/30">
              <span className="block text-[8px] uppercase font-bold text-emerald-500 font-extrabold">Iuran Terkumpul (Lunas)</span>
              <span className="text-xs font-black text-emerald-400">{formatIDR(totalTrackedCollected)}</span>
            </div>
            <div className="bg-rose-950/15 p-2.5 rounded-xl border border-rose-900/30">
              <span className="block text-[8px] uppercase font-bold text-rose-400 font-extrabold">Kurang Kas (Ditagih)</span>
              <span className="text-xs font-black text-[#FF4A6B]">{formatIDR(totalTrackedRemaining)}</span>
            </div>
            <div className="bg-[#1C1D3B]/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="block text-[8px] uppercase font-bold text-[#60A5FA]">Peserta Nambah Jam</span>
              <span className="text-xs font-black text-[#60A5FA]">{rosterBothCount} Orang / {players.length}</span>
            </div>
          </div>

          {/* Interactive Player list with session details */}
          <div className="mt-4">
            <div className="hidden sm:grid grid-cols-12 gap-3 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-4 pb-2 font-display">
              <div className="col-span-4 flex items-center gap-2">Nama Atlet</div>
              <div className="col-span-4 text-center">Keikutsertaan Sesi</div>
              <div className="col-span-2 text-right">Tagihan Iuran</div>
              <div className="col-span-2 text-right">Status Bayar</div>
            </div>

            <div className="bg-slate-950/45 border border-slate-850/80 rounded-2xl overflow-hidden divide-y divide-slate-850/60 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
              {players.map((p) => {
                const isPaid = !!paidPlayers[p.id];
                const attendance = playerSessAttendance[p.id] || 'main';
                const totalOwed = getPlayerOwed(p.id);

                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-1 sm:grid-cols-12 items-center gap-3 py-3 px-4 transition-all ${
                      isPaid 
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10' 
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Column 1: Player Profile */}
                    <div className="col-span-4 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400 shadow-sm' : 'bg-slate-600'}`} />
                      <span className={`text-xs font-bold font-sans transition-colors ${isPaid ? 'text-emerald-300' : 'text-slate-200'}`}>{p.name}</span>
                      {p.gender === 'Perempuan' && (
                        <span className="text-[8px] bg-pink-500/15 text-pink-400 border border-pink-500/20 px-1.5 py-0.2 rounded font-black font-display uppercase tracking-widest leading-none">W</span>
                      )}
                    </div>

                    {/* Column 2: Session Switcher */}
                    <div className="col-span-4 flex justify-start sm:justify-center items-center gap-1.5">
                      {calcType === 'single' ? (
                        <span className="text-[9px] bg-slate-900/60 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg font-bold font-mono">
                          Regular (Full Sesi)
                        </span>
                      ) : (
                        <div className="inline-flex rounded-lg bg-slate-950/90 p-0.5 border border-slate-850 text-[9px] select-none">
                          <button
                            type="button"
                            onClick={() => {
                              if (calcType === 'dual') {
                                setPlayerSessAttendance(prev => ({ ...prev, [p.id]: 'main' }));
                              }
                            }}
                            className={`px-2 py-0.5 rounded-lg font-bold transition-all text-[9.5px] cursor-pointer ${
                              attendance === 'main'
                                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/10'
                                : 'text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            Hanya Regular (2 Jam)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (calcType === 'dual') {
                                setPlayerSessAttendance(prev => ({ ...prev, [p.id]: 'both' }));
                              }
                            }}
                            className={`px-2 py-0.5 rounded-lg font-bold transition-all text-[9.5px] cursor-pointer ${
                              attendance === 'both'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/10'
                                : 'text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            Lanjut Nambah Jam (3 Jam)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Column 3: Amount Due */}
                    <div className={`col-span-2 text-left sm:text-right font-mono text-xs font-extrabold ${isPaid ? 'text-emerald-300' : 'text-white'}`}>
                      <span className="sm:hidden text-slate-500 font-sans text-[8px] uppercase font-bold text-left mb-0.5">Iuran:</span>
                      {formatIDR(totalOwed)}
                    </div>

                    {/* Column 4: Paid Status Button */}
                    <div className="col-span-2 flex justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={() => togglePaid(p.id)}
                        className={`w-full sm:w-auto px-3 py-1 rounded-lg text-[9.5px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 border uppercase font-display ${
                          isPaid
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-extrabold shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-705'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> LUNAS
                          </>
                        ) : (
                          'BELUM BAYAR'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
