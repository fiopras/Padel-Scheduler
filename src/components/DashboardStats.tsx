import React from 'react';
import { Users, Swords, Landmark, CalendarDays } from 'lucide-react';
import { Player, Match } from '../types';

interface DashboardStatsProps {
  players: Player[];
  matches: Match[];
  courtCount: number;
}

export default function DashboardStats({
  players,
  matches,
  courtCount,
}: DashboardStatsProps) {
  const completedMatches = matches.filter((m) => m.status === 'Completed');
  const totalMatchesCount = matches.length;
  
  // Let's get max rounds scheduled
  const maxRound = matches.reduce((max, m) => (m.round > max ? m.round : max), 0);

  const stats = [
    {
      id: 'stat-players',
      name: 'Total Atlet',
      value: players.length,
      icon: Users,
      badgeColor: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
      glowColor: 'group-hover:border-teal-500/50',
      desc: 'Roster atlet terdaftar',
    },
    {
      id: 'stat-matches',
      name: 'Pertandingan',
      value: totalMatchesCount,
      subValue: `${completedMatches.length} Selesai`,
      icon: Swords,
      badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      glowColor: 'group-hover:border-amber-500/50',
      desc: 'Terjadwal di court',
    },
    {
      id: 'stat-courts',
      name: 'Jumlah Court',
      value: courtCount,
      icon: Landmark,
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      glowColor: 'group-hover:border-blue-500/50',
      desc: 'Lapangan aktif terbooking',
    },
    {
      id: 'stat-rounds',
      name: 'Total Putaran (Rounds)',
      value: `${maxRound} Round`,
      icon: CalendarDays,
      badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      glowColor: 'group-hover:border-purple-500/50',
      desc: 'Akumulasi putaran laga',
    },
  ];

  return (
    <div id="dashboard-stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            id={stat.id}
            className={`group flex flex-col justify-between p-5 rounded-2xl bg-[#121B2E]/50 border border-slate-800/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#15223c]/60 hover:shadow-xl hover:shadow-teal-500/5 ${stat.glowColor}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-display leading-tight">
                {stat.name}
              </span>
              <div className={`p-2 rounded-xl transition-all duration-300 ${stat.badgeColor} group-hover:scale-110`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
                  {stat.value}
                </span>
                {stat.subValue && (
                  <span className="text-[11px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-md font-sans">
                    {stat.subValue}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-450 mt-1 font-medium">{stat.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

