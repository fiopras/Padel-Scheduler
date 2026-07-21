import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  Users,
  Wallet,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  X,
  Save,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  ExternalLink,
  Link,
  Percent,
  Hash,
  Crown,
  Zap,
  Eye,
  EyeOff,
  Receipt,
  PiggyBank,
  Target,
  Activity,
} from 'lucide-react';
import { Player, PadelEvent, FinanceEvent, FinanceParticipant, FinancePayment, FinanceCashTransaction, MemberFinanceBalance, FinanceDashboardSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

const formatIDR = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const genLocalId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const handleMoneyInput = (val: string, setter: (s: string) => void) => {
  setter(val.replace(/\D/g, ''));
};

const formatMoneyDisplay = (val: string) => {
  const n = parseInt(val.replace(/\D/g, '') || '0', 10);
  return n.toLocaleString('id-ID');
};

// ─────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────

const api = {
  getFinanceEvents: () => fetch('/api/finance/events').then(r => r.json()),
  createFinanceEvent: (data: any) => fetch('/api/finance/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateFinanceEvent: (id: string, data: any) => fetch(`/api/finance/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteFinanceEvent: (id: string) => fetch(`/api/finance/events/${id}`, { method: 'DELETE' }).then(r => r.json()),
  getParticipants: (id: string) => fetch(`/api/finance/events/${id}/participants`).then(r => r.json()),
  saveParticipants: (id: string, participants: any[]) => fetch(`/api/finance/events/${id}/participants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participants }) }).then(r => r.json()),
  getPayments: (eventId?: string) => fetch(`/api/finance/payments${eventId ? `?event_id=${eventId}` : ''}`).then(r => r.json()),
  createPayment: (data: any) => fetch('/api/finance/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deletePayment: (id: string) => fetch(`/api/finance/payments/${id}`, { method: 'DELETE' }).then(r => r.json()),
  getCash: () => fetch('/api/finance/cash').then(r => r.json()),
  createCash: (data: any) => fetch('/api/finance/cash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteCash: (id: string) => fetch(`/api/finance/cash/${id}`, { method: 'DELETE' }).then(r => r.json()),
  getBalance: () => fetch('/api/finance/balance').then(r => r.json()),
  getDashboard: () => fetch('/api/finance/dashboard').then(r => r.json()),
  getReports: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`/api/finance/reports${qs ? `?${qs}` : ''}`).then(r => r.json());
  },
};

// ─────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────

interface FinanceModuleProps {
  activeEvent: PadelEvent | null;
  players: Player[];
  showNotification: (text: string, type?: 'success' | 'error') => void;
}

type FinanceTab = 'dashboard' | 'events' | 'event-detail' | 'payments' | 'members' | 'cash' | 'reports';

// ─────────────────────────────────────────────────────────────
// PAYMENT STATUS BADGE HELPER
// ─────────────────────────────────────────────────────────────

function PaymentStatusBadge({ charged, paid }: { charged: number; paid: number }) {
  if (charged === 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">Free</span>;
  if (paid === 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 font-bold">Belum Bayar</span>;
  if (paid >= charged) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold">{paid > charged ? 'Lebih Bayar' : 'Lunas'}</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold">Sebagian</span>;
}

// ─────────────────────────────────────────────────────────────
// FINANCE DASHBOARD
// ─────────────────────────────────────────────────────────────

function FinanceDashboard({ summary, loading }: { summary: FinanceDashboardSummary | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        <span className="ml-2 text-slate-400 text-sm">Memuat dashboard...</span>
      </div>
    );
  }

  const cards = [
    { id: 'fc-cash', label: 'Saldo Kas', value: summary?.total_cash || 0, icon: PiggyBank, color: 'emerald', desc: 'Total kas komunitas' },
    { id: 'fc-outstanding', label: 'Outstanding', value: summary?.total_outstanding || 0, icon: AlertCircle, color: 'rose', desc: 'Total piutang member' },
    { id: 'fc-events', label: 'Total Event', value: summary?.total_events || 0, icon: CalendarDays, color: 'teal', desc: 'Finance events', isCurrency: false },
    { id: 'fc-revenue', label: 'Total Revenue', value: summary?.total_revenue || 0, icon: TrendingUp, color: 'amber', desc: 'Akumulasi biaya event' },
  ];

  const monthlyData = summary?.monthly_data?.map(d => ({
    ...d,
    month: new Date(d.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  })) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/50',
            rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:border-rose-500/50',
            teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20 group-hover:border-teal-500/50',
            amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:border-amber-500/50',
          };
          return (
            <div key={card.id} id={card.id} className={`group flex flex-col justify-between p-5 rounded-2xl bg-[#121B2E]/50 border border-slate-800/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colorMap[card.color].split(' ').slice(2).join(' ')}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-display leading-tight">{card.label}</span>
                <div className={`p-2 rounded-xl border transition-all ${colorMap[card.color].split(' ').slice(0, 2).join(' ')} border-${card.color}-500/20 group-hover:scale-110`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
                  {card.isCurrency === false ? card.value : formatIDR(card.value as number)}
                </span>
                <p className="text-[10px] text-slate-450 mt-1 font-medium">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Flow Chart */}
        <div className="p-5 rounded-2xl bg-[#0B1220]/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">Cash Flow Bulanan</h3>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 11 }}
                  formatter={(v: any) => formatIDR(v)}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Pemasukan" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} name="Pengeluaran" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Belum ada data transaksi</div>
          )}
        </div>

        {/* Top Payers */}
        <div className="p-5 rounded-2xl bg-[#0B1220]/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">Ranking Cepat Bayar</h3>
          </div>
          <div className="space-y-2">
            {(summary?.top_payers || []).length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">Belum ada data pembayaran</div>
            ) : (
              (summary?.top_payers || []).slice(0, 7).map((payer, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#121B2E]/40 border border-slate-800/50">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{payer.player_name}</p>
                    <p className="text-[10px] text-slate-500">{payer.sessions} transaksi</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">{formatIDR(payer.total_paid)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Income vs Expense Bar */}
      <div className="p-5 rounded-2xl bg-[#0B1220]/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">Revenue vs Expense</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />Pemasukan {formatIDR(summary?.total_income || 0)}</span>
            <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500" />Pengeluaran {formatIDR(summary?.total_expense || 0)}</span>
          </div>
        </div>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 11 }} formatter={(v: any) => formatIDR(v)} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Pemasukan" />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">Belum ada data</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCE EVENT LIST
// ─────────────────────────────────────────────────────────────

function FinanceEventList({
  activeEvent,
  financeEvents,
  loading,
  onSelect,
  onCreate,
  onDelete,
  showNotification,
}: {
  activeEvent: PadelEvent | null;
  financeEvents: FinanceEvent[];
  loading: boolean;
  onSelect: (ev: FinanceEvent) => void;
  onCreate: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showNotification: (t: string, type?: 'success' | 'error') => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [courtFee, setCourtFee] = useState('');
  const [additionalFee, setAdditionalFee] = useState('0');
  const [taxType, setTaxType] = useState<'percentage' | 'nominal'>('percentage');
  const [taxValue, setTaxValue] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const subtotal = (parseInt(courtFee || '0', 10)) + (parseInt(additionalFee || '0', 10));
  const taxAmount = taxType === 'percentage' ? subtotal * ((parseFloat(taxValue || '0')) / 100) : parseFloat(taxValue || '0');
  const finalTotal = Math.max(0, subtotal + taxAmount - parseFloat(discount || '0'));

  const handleCreate = async () => {
    if (!activeEvent) { showNotification('Tidak ada event aktif', 'error'); return; }
    if (!courtFee || parseInt(courtFee) <= 0) { showNotification('Biaya lapangan wajib diisi', 'error'); return; }
    setCreating(true);
    await onCreate({
      event_id: activeEvent.id,
      event_name: activeEvent.name,
      session_date: sessionDate,
      court_fee: parseInt(courtFee || '0'),
      additional_fee: parseInt(additionalFee || '0'),
      tax_type: taxType,
      tax_value: parseFloat(taxValue || '0'),
      discount: parseFloat(discount || '0'),
      notes,
    });
    setCreating(false);
    setShowCreate(false);
    setCourtFee('');
    setAdditionalFee('0');
    setNotes('');
  };

  const activeEventFinanceEvents = financeEvents.filter(fe => !activeEvent || fe.event_id === activeEvent.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Finance Events</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {activeEvent ? `Event aktif: ${activeEvent.name}` : 'Tidak ada event aktif'}
          </p>
        </div>
        {activeEvent && (
          <button
            id="btn-create-finance-event"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-500/15 flex items-center gap-1.5 font-display uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" /> Buat Finance Event
          </button>
        )}
      </div>

      {/* Create Finance Event Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-2xl bg-[#0B1220]/90 border border-emerald-500/20 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider font-display flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Buat Finance Event Baru
              </h4>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tanggal Sesi</label>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Biaya Lapangan (IDR)</label>
                <input type="text" value={formatMoneyDisplay(courtFee)} onChange={e => handleMoneyInput(e.target.value, setCourtFee)}
                  placeholder="2.345.000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Biaya Tambahan (IDR)</label>
                <input type="text" value={formatMoneyDisplay(additionalFee)} onChange={e => handleMoneyInput(e.target.value, setAdditionalFee)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tax</label>
                  <div className="flex gap-1.5">
                    <select value={taxType} onChange={e => setTaxType(e.target.value as any)}
                      className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors">
                      <option value="percentage">%</option>
                      <option value="nominal">IDR</option>
                    </select>
                    <input type="text" value={taxValue} onChange={e => setTaxValue(e.target.value)}
                      placeholder={taxType === 'percentage' ? '0' : '0'}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Diskon (IDR)</label>
                  <input type="text" value={formatMoneyDisplay(discount)} onChange={e => handleMoneyInput(e.target.value, setDiscount)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
            </div>

            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Catatan (opsional)..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors" />

            {/* Cost Preview */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="text-white">{formatIDR(subtotal)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Tax ({taxType === 'percentage' ? `${taxValue}%` : 'nominal'})</span><span className="text-amber-400">+ {formatIDR(taxAmount)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Diskon</span><span className="text-rose-400">- {formatIDR(parseFloat(discount || '0'))}</span></div>
              <div className="flex justify-between text-white font-black border-t border-slate-800 pt-1.5"><span>TOTAL AKHIR</span><span className="text-emerald-400 text-sm">{formatIDR(finalTotal)}</span></div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black rounded-xl transition-all border border-slate-800 uppercase tracking-wider">Batal</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
                {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {creating ? 'Menyimpan...' : 'Buat Event'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finance Events List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Memuat finance events...
        </div>
      ) : activeEventFinanceEvents.length === 0 ? (
        <div className="text-center py-16 bg-[#0B1220]/60 border border-slate-900 rounded-2xl space-y-3">
          <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-400">Belum ada Finance Event</p>
          <p className="text-xs text-slate-600">{activeEvent ? 'Klik "Buat Finance Event" untuk mulai mencatat biaya sesi bermain.' : 'Pilih event aktif terlebih dahulu.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeEventFinanceEvents.map(fe => {
            const statusConfig: Record<string, { label: string; color: string }> = {
              draft: { label: 'Draft', color: 'text-slate-400 bg-slate-800 border-slate-700' },
              active: { label: 'Active', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
              completed: { label: 'Selesai', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            };
            const sc = statusConfig[fe.status] || statusConfig.draft;
            return (
              <div key={fe.id} className="group p-4 rounded-2xl bg-[#121B2E]/50 border border-slate-800 hover:border-emerald-500/30 transition-all cursor-pointer"
                onClick={() => onSelect(fe)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{fe.event_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{formatDate(fe.session_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-emerald-400 font-mono">{formatIDR(fe.final_total)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${sc.color}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); onDelete(fe.id); }}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCE EVENT DETAIL (Cost Split + Participants)
// ─────────────────────────────────────────────────────────────

function FinanceEventDetail({
  financeEvent,
  players,
  onBack,
  onUpdate,
  showNotification,
}: {
  financeEvent: FinanceEvent;
  players: Player[];
  onBack: () => void;
  onUpdate: () => void;
  showNotification: (t: string, type?: 'success' | 'error') => void;
}) {
  const [participants, setParticipants] = useState<FinanceParticipant[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [saving, setSaving] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingPlayer, setPayingPlayer] = useState<FinanceParticipant | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'transfer' | 'cash' | 'other'>('transfer');
  const [payNotes, setPayNotes] = useState('');
  const [payProof, setPayProof] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingPart(true);
    const [partRes, payRes] = await Promise.all([
      api.getParticipants(financeEvent.id),
      api.getPayments(financeEvent.id),
    ]);

    let parts: FinanceParticipant[] = partRes.participants || [];

    // Auto-populate from players if empty
    if (parts.length === 0 && players.length > 0) {
      parts = players.map(p => ({
        id: genLocalId('fp'),
        finance_event_id: financeEvent.id,
        player_id: p.id,
        player_name: p.name,
        attendance_status: 'hadir' as const,
        split_type: 'equal' as const,
        custom_amount: 0,
        final_charge: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    setParticipants(parts);
    setPayments(payRes.payments || []);
    setLoadingPart(false);
  }, [financeEvent.id, players]);

  useEffect(() => { loadData(); }, [loadData]);

  // Recalculate charges
  const recalculate = useCallback((parts: FinanceParticipant[]) => {
    const attending = parts.filter(p => p.attendance_status === 'hadir' && p.split_type !== 'free');
    const freeCount = parts.filter(p => p.attendance_status === 'hadir' && p.split_type === 'free').length;
    const customTotal = attending.filter(p => p.split_type === 'custom').reduce((s, p) => s + p.custom_amount, 0);
    const equalCount = attending.filter(p => p.split_type === 'equal').length;
    const remaining = Math.max(0, financeEvent.final_total - customTotal);
    const equalShare = equalCount > 0 ? Math.ceil(remaining / equalCount / 1000) * 1000 : 0;

    return parts.map(p => {
      if (p.attendance_status === 'batal' || p.split_type === 'free') return { ...p, final_charge: 0 };
      if (p.split_type === 'custom') return { ...p, final_charge: p.custom_amount };
      return { ...p, final_charge: equalShare };
    });
  }, [financeEvent.final_total]);

  const handleToggleAttendance = (pid: string) => {
    const updated = participants.map(p =>
      p.id === pid ? { ...p, attendance_status: (p.attendance_status === 'hadir' ? 'batal' : 'hadir') as any } : p
    );
    setParticipants(recalculate(updated));
  };

  const handleChangeSplitType = (pid: string, type: 'equal' | 'custom' | 'free') => {
    const updated = participants.map(p => p.id === pid ? { ...p, split_type: type } : p);
    setParticipants(recalculate(updated));
  };

  const handleChangeCustomAmount = (pid: string, val: string) => {
    const amount = parseInt(val.replace(/\D/g, '') || '0', 10);
    const updated = participants.map(p => p.id === pid ? { ...p, custom_amount: amount } : p);
    setParticipants(recalculate(updated));
  };

  const handleAddPlayer = () => {
    const newPart: FinanceParticipant = {
      id: genLocalId('fp'),
      finance_event_id: financeEvent.id,
      player_id: genLocalId('ext'),
      player_name: '',
      attendance_status: 'hadir',
      split_type: 'equal',
      custom_amount: 0,
      final_charge: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setParticipants(prev => recalculate([...prev, newPart]));
  };

  const handleRemovePlayer = (pid: string) => {
    setParticipants(prev => recalculate(prev.filter(p => p.id !== pid)));
  };

  const handleSave = async () => {
    setSaving(true);
    await api.saveParticipants(financeEvent.id, participants);
    // Update event status to active if it was draft
    if (financeEvent.status === 'draft') {
      await api.updateFinanceEvent(financeEvent.id, { ...financeEvent, status: 'active' });
    }
    setSaving(false);
    showNotification('Participants & pembagian biaya tersimpan!', 'success');
    onUpdate();
  };

  // Payment helpers
  const getPlayerPaid = (playerId: string) =>
    payments.filter(p => p.player_id === playerId).reduce((s, p) => s + p.amount, 0);

  const handleSubmitPayment = async () => {
    if (!payingPlayer || !payAmount) { showNotification('Isi nominal pembayaran', 'error'); return; }
    setSubmittingPay(true);
    await api.createPayment({
      finance_event_id: financeEvent.id,
      player_id: payingPlayer.player_id,
      player_name: payingPlayer.player_name,
      amount: parseInt(payAmount.replace(/\D/g, '') || '0', 10),
      payment_date: payDate,
      payment_method: payMethod,
      notes: payNotes,
      proof_url: payProof,
    });
    setSubmittingPay(false);
    setShowPaymentModal(false);
    setPayAmount('');
    setPayNotes('');
    setPayProof('');
    showNotification(`Pembayaran ${payingPlayer.player_name} berhasil dicatat!`, 'success');
    loadData();
    onUpdate();
  };

  const attendingParticipants = participants.filter(p => p.attendance_status === 'hadir');
  const totalCharged = attendingParticipants.reduce((s, p) => s + p.final_charge, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = Math.max(0, totalCharged - totalPaid);

  const subtotal = financeEvent.court_fee + financeEvent.additional_fee;
  const taxAmount = financeEvent.tax_type === 'percentage'
    ? subtotal * (financeEvent.tax_value / 100)
    : financeEvent.tax_value;

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h3 className="text-sm font-black text-white font-display">{financeEvent.event_name}</h3>
          <p className="text-[10px] text-slate-500">{formatDate(financeEvent.session_date)}</p>
        </div>
      </div>

      {/* Cost Breakdown Card */}
      <div className="p-5 rounded-2xl bg-[#0B1220]/80 border border-emerald-500/20 space-y-3">
        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider font-display">Rincian Biaya</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Biaya Lapangan', value: formatIDR(financeEvent.court_fee), color: 'text-white' },
            { label: 'Biaya Tambahan', value: formatIDR(financeEvent.additional_fee), color: 'text-slate-300' },
            { label: `Tax (${financeEvent.tax_type === 'percentage' ? financeEvent.tax_value + '%' : 'nominal'})`, value: `+ ${formatIDR(taxAmount)}`, color: 'text-amber-400' },
            { label: 'Diskon', value: `- ${formatIDR(financeEvent.discount)}`, color: 'text-rose-400' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">{item.label}</p>
              <p className={`font-black font-mono ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs font-bold text-emerald-400">TOTAL AKHIR</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{formatIDR(financeEvent.final_total)}</span>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 mb-1">Total Tagihan</p>
            <p className="font-black font-mono text-white">{formatIDR(totalCharged)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 mb-1">Sudah Bayar</p>
            <p className="font-black font-mono text-emerald-400">{formatIDR(totalPaid)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 mb-1">Outstanding</p>
            <p className={`font-black font-mono ${totalOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatIDR(totalOutstanding)}</p>
          </div>
        </div>
      </div>

      {/* Split Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mode Split:</span>
        {(['equal', 'custom'] as const).map(mode => (
          <button key={mode} onClick={() => setSplitMode(mode)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${splitMode === mode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-white'}`}>
            {mode === 'equal' ? 'Equal Split' : 'Custom Split'}
          </button>
        ))}
      </div>

      {/* Participants Table */}
      {loadingPart ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Memuat peserta...
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0B1220]/80 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-display">
              Peserta ({attendingParticipants.length} hadir)
            </h4>
            <button onClick={handleAddPlayer} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3 h-3" /> Tambah
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {participants.map(part => {
              const paid = getPlayerPaid(part.player_id);
              const charged = part.final_charge;
              return (
                <div key={part.id} className={`flex items-center gap-3 px-4 py-3 transition-all ${part.attendance_status === 'batal' ? 'opacity-40' : ''}`}>
                  {/* Attendance Toggle */}
                  <button onClick={() => handleToggleAttendance(part.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${part.attendance_status === 'hadir' ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-700 hover:border-slate-500'}`}>
                    {part.attendance_status === 'hadir' && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    {part.player_name ? (
                      <p className="text-xs font-bold text-white truncate">{part.player_name}</p>
                    ) : (
                      <input type="text" placeholder="Nama pemain..."
                        onChange={e => setParticipants(prev => prev.map(p => p.id === part.id ? { ...p, player_name: e.target.value } : p))}
                        className="w-full px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
                    )}
                  </div>

                  {/* Split Controls */}
                  {splitMode === 'custom' && part.attendance_status === 'hadir' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select value={part.split_type} onChange={e => handleChangeSplitType(part.id, e.target.value as any)}
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-[10px] focus:outline-none">
                        <option value="equal">Equal</option>
                        <option value="custom">Custom</option>
                        <option value="free">Free</option>
                      </select>
                      {part.split_type === 'custom' && (
                        <input type="text" value={formatMoneyDisplay(String(part.custom_amount || ''))}
                          onChange={e => handleChangeCustomAmount(part.id, e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-[10px] font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
                      )}
                    </div>
                  )}

                  {/* Charge & Payment Status */}
                  <div className="shrink-0 text-right space-y-0.5">
                    <p className="text-xs font-mono font-black text-white">{formatIDR(charged)}</p>
                    <PaymentStatusBadge charged={charged} paid={paid} />
                  </div>

                  {/* Record Payment Button */}
                  {part.attendance_status === 'hadir' && charged > 0 && (
                    <button
                      onClick={() => { setPayingPlayer(part); setPayAmount(String(Math.max(0, charged - paid))); setShowPaymentModal(true); }}
                      className="shrink-0 px-2.5 py-1 bg-teal-500/15 hover:bg-teal-500/30 text-teal-400 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1 border border-teal-500/20">
                      <Plus className="w-3 h-3" /> Bayar
                    </button>
                  )}

                  {/* Remove */}
                  <button onClick={() => handleRemovePlayer(part.id)}
                    className="p-1 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="px-4 py-3 border-t border-slate-800">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Menyimpan...' : 'Simpan Pembagian Biaya'}
            </button>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="rounded-2xl bg-[#0B1220]/80 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-teal-400" /> Riwayat Pembayaran
            </h4>
          </div>
          <div className="divide-y divide-slate-800">
            {payments.map(pay => (
              <div key={pay.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{pay.player_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{formatDate(pay.payment_date)} • {pay.payment_method}</p>
                  {pay.notes && <p className="text-[10px] text-slate-600 italic truncate">{pay.notes}</p>}
                  {pay.proof_url && (
                    <a href={pay.proof_url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
                      <Link className="w-2.5 h-2.5" /> Lihat Bukti Transfer
                    </a>
                  )}
                </div>
                <span className="text-sm font-black text-emerald-400 font-mono shrink-0">{formatIDR(pay.amount)}</span>
                <button onClick={async () => { await api.deletePayment(pay.id); loadData(); showNotification('Pembayaran dihapus'); }}
                  className="p-1 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && payingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0B1220]/95 border border-slate-800 rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl space-y-4 ring-1 ring-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white font-display">Catat Pembayaran</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{payingPlayer.player_name}</p>
                  <p className="text-[10px] text-slate-500">Tagihan: {formatIDR(payingPlayer.final_charge)}</p>
                </div>
                <PaymentStatusBadge charged={payingPlayer.final_charge} paid={getPlayerPaid(payingPlayer.player_id)} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nominal Transfer (IDR)</label>
                  <input type="text" value={formatMoneyDisplay(payAmount)} onChange={e => setPayAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono font-black focus:outline-none focus:border-teal-500 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tanggal</label>
                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-teal-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Metode</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors">
                      <option value="transfer">Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Link Bukti Transfer (Opsional)</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input type="url" value={payProof} onChange={e => setPayProof(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors" />
                  </div>
                </div>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Catatan (opsional)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black rounded-xl transition-all border border-slate-800 uppercase tracking-wider">Batal</button>
                <button onClick={handleSubmitPayment} disabled={submittingPay}
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {submittingPay ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {submittingPay ? 'Menyimpan...' : 'Catat Bayar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MEMBER FINANCE BALANCE
// ─────────────────────────────────────────────────────────────

function MemberFinanceBalances({ showNotification }: { showNotification: (t: string, type?: 'success' | 'error') => void }) {
  const [balances, setBalances] = useState<MemberFinanceBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOutstanding, setFilterOutstanding] = useState(false);

  useEffect(() => {
    api.getBalance().then(r => {
      setBalances(r.balances || []);
      setLoading(false);
    });
  }, []);

  const filtered = filterOutstanding ? balances.filter(b => b.outstanding > 0) : balances;

  const exportToExcel = () => {
    const rows = filtered.map(b => ({
      'Nama': b.player_name,
      'Total Sesi': b.total_sessions,
      'Total Tagihan': b.total_charged,
      'Total Bayar': b.total_paid,
      'Outstanding': b.outstanding,
      'Kredit': b.credit,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Member Balance');
    XLSX.writeFile(wb, `cotta-finance-balance-${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export Excel berhasil!', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Saldo Member</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterOutstanding(v => !v)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all border uppercase tracking-wider ${filterOutstanding ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white'}`}>
            {filterOutstanding ? '✓ Outstanding' : 'Filter Outstanding'}
          </button>
          <button onClick={exportToExcel} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-xl transition-all border border-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Memuat data...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#0B1220]/60 border border-slate-900 rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">Belum ada data saldo member</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0B1220]/80 border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {filtered.sort((a, b) => b.outstanding - a.outstanding).map((bal, idx) => (
              <div key={bal.player_id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 font-mono">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{bal.player_name}</p>
                  <p className="text-[10px] text-slate-500">{bal.total_sessions} sesi bermain</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs hidden sm:grid">
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">Tagihan</p>
                    <p className="font-mono font-bold text-white">{formatIDR(bal.total_charged)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">Bayar</p>
                    <p className="font-mono font-bold text-emerald-400">{formatIDR(bal.total_paid)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">{bal.credit > 0 ? 'Kredit' : 'Outstanding'}</p>
                    <p className={`font-mono font-bold ${bal.credit > 0 ? 'text-teal-400' : bal.outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {bal.credit > 0 ? `+${formatIDR(bal.credit)}` : formatIDR(bal.outstanding)}
                    </p>
                  </div>
                </div>
                <div className="sm:hidden">
                  <PaymentStatusBadge charged={bal.total_charged} paid={bal.total_paid} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CASH MANAGEMENT (Kas Komunitas)
// ─────────────────────────────────────────────────────────────

function CashManagement({ showNotification }: { showNotification: (t: string, type?: 'success' | 'error') => void }) {
  const [transactions, setTransactions] = useState<FinanceCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txCategory, setTxCategory] = useState('other');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const incomeCategories = ['member_payment', 'sponsor', 'other'];
  const expenseCategories = ['court_fee', 'bola', 'operasional', 'other'];
  const categoryLabel: Record<string, string> = {
    member_payment: 'Pembayaran Member', sponsor: 'Sponsor', court_fee: 'Sewa Lapangan',
    bola: 'Bola', operasional: 'Operasional', other: 'Lainnya',
  };

  const loadData = async () => {
    setLoading(true);
    const res = await api.getCash();
    setTransactions(res.transactions || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const handleSubmit = async () => {
    if (!txDesc || !txAmount) { showNotification('Isi deskripsi dan nominal', 'error'); return; }
    setSubmitting(true);
    await api.createCash({
      type: txType,
      category: txCategory,
      description: txDesc,
      amount: parseInt(txAmount.replace(/\D/g, '') || '0', 10),
      transaction_date: txDate,
    });
    setSubmitting(false);
    setShowForm(false);
    setTxDesc('');
    setTxAmount('');
    showNotification('Transaksi kas berhasil dicatat!', 'success');
    loadData();
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Saldo Kas', value: balance, color: balance >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Total Masuk', value: totalIncome, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
          { label: 'Total Keluar', value: totalExpense, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border ${s.bg}`}>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{s.label}</p>
            <p className={`text-lg font-black font-mono mt-1 ${s.color}`}>{formatIDR(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Add Transaction */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Kas Komunitas</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-1.5 font-display uppercase tracking-wider">
          <Plus className="w-3.5 h-3.5" /> Tambah Transaksi
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-2xl bg-[#0B1220]/90 border border-emerald-500/20 space-y-3">
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button key={t} onClick={() => { setTxType(t); setTxCategory('other'); }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 ${txType === t ? (t === 'income' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white') : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-white'}`}>
                  {t === 'income' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Kategori</label>
                <select value={txCategory} onChange={e => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors">
                  {(txType === 'income' ? incomeCategories : expenseCategories).map(cat => (
                    <option key={cat} value={cat}>{categoryLabel[cat]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tanggal</label>
                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Deskripsi</label>
              <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="e.g. Sponsor banner, Beli bola, ..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nominal (IDR)</label>
              <input type="text" value={formatMoneyDisplay(txAmount)} onChange={e => setTxAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="500.000"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono font-black focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black rounded-xl transition-all border border-slate-800 uppercase tracking-wider">Batal</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {submitting ? 'Menyimpan...' : 'Catat'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Memuat transaksi...
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-14 bg-[#0B1220]/60 border border-slate-900 rounded-2xl">
          <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">Belum ada transaksi kas</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0B1220]/80 border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                  {tx.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{tx.description}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{formatDate(tx.transaction_date)} • {categoryLabel[tx.category] || tx.category}</p>
                </div>
                <span className={`text-sm font-black font-mono shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                </span>
                <button onClick={async () => { await api.deleteCash(tx.id); loadData(); showNotification('Transaksi dihapus'); }}
                  className="p-1 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCE REPORTS
// ─────────────────────────────────────────────────────────────

function FinanceReports({ financeEvents, showNotification }: { financeEvents: FinanceEvent[]; showNotification: (t: string, type?: 'success' | 'error') => void }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [report, setReport] = useState<{ events: FinanceEvent[]; payments: FinancePayment[]; cash_transactions: FinanceCashTransaction[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (selectedEventId) params.event_id = selectedEventId;
    const res = await api.getReports(params);
    setReport(res.report || null);
    setLoading(false);
  };

  const exportReport = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();

    // Events sheet
    const evRows = report.events.map(e => ({
      'Event': e.event_name, 'Tanggal': e.session_date,
      'Biaya Lapangan': e.court_fee, 'Biaya Tambahan': e.additional_fee,
      'Tax': e.tax_value, 'Diskon': e.discount, 'Total': e.final_total, 'Status': e.status,
    }));
    if (evRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evRows), 'Finance Events');

    // Payments sheet
    const payRows = report.payments.map(p => ({
      'Pemain': p.player_name, 'Event ID': p.finance_event_id,
      'Nominal': p.amount, 'Tanggal': p.payment_date, 'Metode': p.payment_method, 'Catatan': p.notes || '', 'Bukti': p.proof_url || '',
    }));
    if (payRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payRows), 'Payments');

    // Cash sheet
    const cashRows = report.cash_transactions.map(t => ({
      'Tipe': t.type, 'Kategori': t.category, 'Deskripsi': t.description, 'Nominal': t.amount, 'Tanggal': t.transaction_date,
    }));
    if (cashRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cashRows), 'Kas Komunitas');

    XLSX.writeFile(wb, `cotta-finance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Laporan berhasil diekspor ke Excel!', 'success');
  };

  const totalRevenue = report?.events.reduce((s, e) => s + e.final_total, 0) || 0;
  const totalPaid = report?.payments.reduce((s, p) => s + p.amount, 0) || 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Laporan Keuangan</h3>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#0B1220]/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Laporan</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Dari Tanggal</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Sampai Tanggal</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Filter Event</label>
            <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="">Semua Event</option>
              {financeEvents.map(fe => <option key={fe.id} value={fe.id}>{fe.event_name} ({formatDate(fe.session_date)})</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReport} disabled={loading}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
            {loading ? 'Memuat...' : 'Generate Laporan'}
          </button>
          {report && (
            <button onClick={exportReport}
              className="px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-black rounded-xl transition-all border border-indigo-500/20 flex items-center gap-1.5 uppercase tracking-wider">
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Report Results */}
      {report && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#121B2E]/50 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Revenue Events</p>
              <p className="text-xl font-black text-emerald-400 font-mono mt-1">{formatIDR(totalRevenue)}</p>
              <p className="text-[10px] text-slate-600">{report.events.length} events</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#121B2E]/50 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Pembayaran</p>
              <p className="text-xl font-black text-teal-400 font-mono mt-1">{formatIDR(totalPaid)}</p>
              <p className="text-[10px] text-slate-600">{report.payments.length} transaksi</p>
            </div>
          </div>

          {/* Payments Table */}
          {report.payments.length > 0 && (
            <div className="rounded-2xl bg-[#0B1220]/80 border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-display">Riwayat Pembayaran ({report.payments.length})</h4>
              </div>
              <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
                {report.payments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{p.player_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{formatDate(p.payment_date)}</p>
                    </div>
                    <span className="font-mono font-black text-emerald-400">{formatIDR(p.amount)}</span>
                    {p.proof_url && (
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT FINANCE MODULE COMPONENT
// ─────────────────────────────────────────────────────────────

export default function FinanceModule({ activeEvent, players, showNotification }: FinanceModuleProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [financeEvents, setFinanceEvents] = useState<FinanceEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedFinanceEvent, setSelectedFinanceEvent] = useState<FinanceEvent | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<FinanceDashboardSummary | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const loadFinanceEvents = useCallback(async () => {
    setLoadingEvents(true);
    const res = await api.getFinanceEvents();
    setFinanceEvents(res.events || []);
    setLoadingEvents(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    const res = await api.getDashboard();
    setDashboardSummary(res.summary || null);
    setLoadingDashboard(false);
  }, []);

  useEffect(() => {
    loadFinanceEvents();
    loadDashboard();
  }, [loadFinanceEvents, loadDashboard]);

  const handleCreateFinanceEvent = async (data: any) => {
    const res = await api.createFinanceEvent(data);
    if (res.error) { showNotification(res.error, 'error'); return; }
    showNotification('Finance event berhasil dibuat!', 'success');
    await loadFinanceEvents();
    await loadDashboard();
  };

  const handleDeleteFinanceEvent = async (id: string) => {
    const res = await api.deleteFinanceEvent(id);
    if (res.error) { showNotification(res.error, 'error'); return; }
    showNotification('Finance event dihapus.', 'success');
    if (selectedFinanceEvent?.id === id) setSelectedFinanceEvent(null);
    await loadFinanceEvents();
    await loadDashboard();
  };

  const tabs: { id: FinanceTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Finance Events', icon: Receipt },
    { id: 'members', label: 'Saldo Member', icon: Users },
    { id: 'cash', label: 'Kas Komunitas', icon: PiggyBank },
    { id: 'reports', label: 'Laporan', icon: FileText },
  ];

  return (
    <div id="finance-module-root" className="space-y-6">
      {/* Finance Module Header */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/20">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
          <DollarSign className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white font-display flex items-center gap-2">
            COTTA FINANCE
            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 py-0.5 px-1.5 rounded font-black border border-emerald-500/20 tracking-wider">MODULE</span>
          </h2>
          <p className="text-[10px] text-emerald-400/70 font-mono">
            {activeEvent ? `Event Aktif: ${activeEvent.name}` : 'Tidak ada event aktif'}
          </p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-nowrap items-center gap-1 bg-[#090D16] border border-slate-900 p-1.5 rounded-2xl overflow-x-auto scrollbar-none pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (activeTab === 'event-detail' && tab.id === 'events');
          return (
            <button
              key={tab.id}
              id={`finance-tab-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'events') setSelectedFinanceEvent(null);
              }}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 font-display shrink-0 ${isActive ? 'bg-[#121B2E] text-emerald-400 border border-emerald-500/20 shadow-lg' : 'text-slate-450 hover:text-white'}`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (selectedFinanceEvent?.id || '')}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'dashboard' && (
            <FinanceDashboard summary={dashboardSummary} loading={loadingDashboard} />
          )}

          {activeTab === 'events' && !selectedFinanceEvent && (
            <FinanceEventList
              activeEvent={activeEvent}
              financeEvents={financeEvents}
              loading={loadingEvents}
              onSelect={ev => { setSelectedFinanceEvent(ev); setActiveTab('event-detail'); }}
              onCreate={handleCreateFinanceEvent}
              onDelete={handleDeleteFinanceEvent}
              showNotification={showNotification}
            />
          )}

          {(activeTab === 'event-detail' || (activeTab === 'events' && selectedFinanceEvent)) && selectedFinanceEvent && (
            <FinanceEventDetail
              financeEvent={selectedFinanceEvent}
              players={players}
              onBack={() => { setSelectedFinanceEvent(null); setActiveTab('events'); }}
              onUpdate={() => { loadFinanceEvents(); loadDashboard(); }}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'members' && (
            <MemberFinanceBalances showNotification={showNotification} />
          )}

          {activeTab === 'cash' && (
            <CashManagement showNotification={showNotification} />
          )}

          {activeTab === 'reports' && (
            <FinanceReports financeEvents={financeEvents} showNotification={showNotification} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
