import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Award, Zap } from 'lucide-react';
import { Player, Match } from '../types';

interface AnalyticsChartsProps {
  players: Player[];
  matches: Match[];
}

export default function AnalyticsCharts({ players, matches }: AnalyticsChartsProps) {
  const completedMatches = matches.filter((m) => m.status === 'Completed');

  // 1. Data Win Rate (Top 8 Players)
  const winRateData = [...players]
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 8)
    .map((p) => ({
      name: p.name,
      'Win Rate (%)': p.winRate,
      'Matches Won': p.matchesWon,
    }));

  // 2. Court Match Distribution (How busy are the courts?)
  const courtCounts: Record<string, number> = {};
  matches.forEach((m) => {
    courtCounts[m.courtName] = (courtCounts[m.courtName] || 0) + 1;
  });
  const courtData = Object.keys(courtCounts).map((court) => ({
    name: court,
    Matches: courtCounts[court],
  }));

  const COLORS = ['#14B8A6', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];

  return (
    <div id="analytics-charts" className="space-y-8">
      {/* Main Stats Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win Rate Chart */}
        <div className="lg:col-span-2 bg-[#121B2E]/45 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display uppercase tracking-tight">
              <Award className="w-4.5 h-4.5 text-teal-400" /> Rasio Kemenangan Atlet Tertinggi
            </h4>
            <p className="text-[10px] text-slate-450 mt-0.5">Top 8 atlet teraktif diurutkan berdasarkan rasio kemenangan (%).</p>
          </div>
          
          <div className="h-64">
            {winRateData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-505 font-medium">Belum ada data visualisasi kemenangan.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winRateData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.25} vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090D16', borderColor: '#1F2937', borderRadius: 12, padding: '10px 12px' }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 11, fontFamily: 'sans-serif' }}
                    itemStyle={{ color: '#14B8A6', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="Win Rate (%)" fill="#14B8A6" radius={[6, 6, 0, 0]} barSize={28}>
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#F59E0B' : '#14B8A6'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Court match distribution (Pie) */}
        <div className="bg-[#121B2E]/45 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display uppercase tracking-tight">
              <Zap className="w-4.5 h-4.5 text-amber-400" /> Utilisasi Block Lapangan
            </h4>
            <p className="text-[10px] text-slate-450 mt-0.5">Volume kecenderungan aktivitas pertandingan per-court.</p>
          </div>

          <div className="h-64 flex flex-col justify-between">
            <div className="h-44">
              {courtData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-505 font-medium">Belum ada sirkulasi court.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courtData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="Matches"
                    >
                      {courtData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090D16', borderColor: '#1F2937', borderRadius: 12 }}
                      itemStyle={{ color: '#FFFFFF', fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2 border-t border-slate-800/40 pt-3">
              {courtData.map((d, idx) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="truncate font-medium">{d.name} ({d.Matches} laga)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
