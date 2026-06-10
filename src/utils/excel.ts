import * as XLSX from 'xlsx';
import { Player, Match } from '../types';

/**
 * Parses players from an uploaded Excel file
 */
export async function parsePlayersFromExcel(file: File): Promise<Partial<Player>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Gagal membaca resource file.');
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        // Grab the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse as JSON array of arrays or objects
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rows.length === 0) {
          resolve([]);
          return;
        }

        // Determine columns
        // Standard expected columns: "Nama" / "Name"
        const headers = rows[0] as string[];
        let nameIdx = headers.findIndex((h) => {
          const lower = String(h).toLowerCase();
          return lower.includes('nama') || lower.includes('name') || lower.includes('pemain') || lower.includes('player');
        });

        const genderIdx = headers.findIndex((h) => {
          const lower = String(h).toLowerCase();
          return lower.includes('gender') || lower.includes('jenis kelamin') || lower.includes('sex');
        });
        const skillIdx = headers.findIndex((h) => {
          const lower = String(h).toLowerCase();
          return lower.includes('skill') || lower.includes('level') || lower.includes('kemampuan');
        });

        // Smart Header Detection
        // If there is no name index, we assume the first column (index 0) is the name
        if (nameIdx === -1) {
          nameIdx = 0;
        }

        const firstCellStr = String(rows[0][nameIdx] || '').toLowerCase().trim();
        const headerKeywords = ['nama', 'name', 'pemain', 'player', 'atlet', 'athlete', 'daftar', 'wajib', 'temp', 'import'];
        const isHeader = headerKeywords.some((keyword) => firstCellStr.includes(keyword));
        const startRowIdx = isHeader ? 1 : 0;

        const players: Partial<Player>[] = [];

        for (let i = startRowIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Resolve name
          const rawName = row[nameIdx];
          if (!rawName) continue; // Skip empty rows

          const name = String(rawName).trim();
          if (!name) continue;

          // Resolve gender (defaults to Laki-laki since only names are supplied)
          let gender: 'Laki-laki' | 'Perempuan' | 'Lainnya' = 'Laki-laki';
          if (genderIdx !== -1 && row[genderIdx]) {
            const rawGender = String(row[genderIdx]).toLowerCase().trim();
            if (rawGender.includes('p') || rawGender.includes('fem') || rawGender.includes('wanita') || rawGender.includes('perempuan')) {
              gender = 'Perempuan';
            } else if (rawGender.includes('lain') || rawGender.includes('other') || rawGender.includes('mix')) {
              gender = 'Lainnya';
            }
          }

          // Resolve skill (defaults to Intermediate since only names are supplied)
          let skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
          if (skillIdx !== -1 && row[skillIdx]) {
            const rawSkill = String(row[skillIdx]).toLowerCase().trim();
            if (rawSkill.includes('beg') || rawSkill.includes('pemula') || rawSkill.includes('baru')) {
              skillLevel = 'Beginner';
            } else if (rawSkill.includes('adv') || rawSkill.includes('pro') || rawSkill.includes('mahir')) {
              skillLevel = 'Advanced';
            }
          }

          players.push({
            name,
            gender,
            skillLevel,
          });
        }

        resolve(players);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Standard utility to apply column autowidth calculation, titles and freeze row 1
 */
function applySheetDesign(ws: XLSX.WorkSheet, headerRowIndex: number = 0) {
  // 1. Column Autowidth
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const colWidths: { wch: number }[] = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10; // default lower-bound min column width
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = { c: C, r: R };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = ws[cellRef];
      if (cell && cell.v !== undefined) {
        const valueLength = String(cell.v).length;
        if (valueLength > maxWidth) {
          maxWidth = valueLength;
        }
      }
    }
    colWidths.push({ wch: Math.max(maxWidth + 4, 12) }); // add beautiful comfortable padding
  }
  ws['!cols'] = colWidths;

  // 2. High Quality Spacious Row Heights (Beautifying Excel)
  const totalRowsCount = range.e.r + 1;
  const rowHeights: { hpt: number }[] = [];
  for (let r = 0; r < totalRowsCount; r++) {
    if (headerRowIndex === 0) {
      // For simple list with no title banner (headers are at index 0)
      if (r === 0) {
        rowHeights.push({ hpt: 26 }); // Header row
      } else {
        rowHeights.push({ hpt: 20 }); // Data rows
      }
    } else {
      // For sheets with title banner (title is at row 0, spacing is at row 1, headers at row 2)
      if (r === 0) {
        rowHeights.push({ hpt: 35 }); // Title banner row
      } else if (r === 1) {
        rowHeights.push({ hpt: 12 }); // Spacing row
      } else if (r === 2) {
        rowHeights.push({ hpt: 26 }); // Table headers row
      } else {
        rowHeights.push({ hpt: 22 }); // Data rows
      }
    }
  }
  ws['!rows'] = rowHeights;

  // 3. Freeze the header row
  ws['!views'] = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: headerRowIndex + 1,
      topLeftCell: `A${headerRowIndex + 2}`,
      activePane: 'bottomLeft',
    },
  ];
}

/**
 * Download static player template
 */
export function downloadPlayerTemplate() {
  const wsData = [
    ['NAMA PEMAIN (Wajib)'],
    ['Aziz'],
    ['Jay'],
    ['Ibra'],
    ['Bes'],
    ['Mas Rizal'],
    ['Fio'],
    ['Wisnu'],
    ['Samy'],
    ['Adi'],
    ['Haikal'],
    ['Agung'],
    ['Firman'],
    ['Adhe'],
    ['Rama'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  applySheetDesign(ws, 0);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Import');
  XLSX.writeFile(wb, 'template_daftar_pemain.xlsx');
}

/**
 * Downloads Match Schedule to Excel
 */
export function exportScheduleToExcel(matches: Match[], players: Player[]) {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const headers = [
    'Round 🏆',
    'Lapangan Stadium 🏟️',
    'Tim 1 (Team 1) 👥',
    'Skor Tim 1 🎯',
    'Skor Tim 2 🎯',
    'Tim 2 (Team 2) 👥'
  ];
  const rows = matches.map((m) => {
    const t1Names = m.team1.map((id) => playerMap.get(id)?.name || id).join(' & ');
    const t2Names = m.team2.map((id) => playerMap.get(id)?.name || id).join(' & ');
    return [
      `Round ${m.round}`,
      m.courtName,
      t1Names,
      m.status === 'Completed' ? (m.score1 ?? 0) : '',
      m.status === 'Completed' ? (m.score2 ?? 0) : '',
      t2Names,
    ];
  });

  const wsData = [['JADWAL & SKOR HASIL PERTANDINGAN INDONESIA 🇮🇩'], [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Custom headers are at row index 2 (1-based: row 3)
  applySheetDesign(ws, 2);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal & Skor');
  XLSX.writeFile(wb, 'jadwal_dan_skor_pertandingan.xlsx');
}

/**
 * Downloads Leaderboards to Excel
 */
export function exportLeaderboardToExcel(leaderboard: Player[]) {
  const headers = [
    'Rank 🏅',
    'Nama Pemain 👤',
    'Gender 🚻',
    'Skill Level 📈',
    'Main (Matches) 🎮',
    'Menang 🏆',
    'Kalah ❌',
    'Win Rate (%) 📊',
    'Game Menang 🎾',
    'Game Kalah 📉',
    'Total Point ⭐',
    'Menit Bermain ⏱️',
  ];

  const rows = leaderboard.map((p, idx) => [
    idx + 1,
    p.name,
    p.gender,
    p.skillLevel,
    p.matchesPlayed,
    p.matchesWon,
    p.matchesLost,
    `${p.winRate}%`,
    p.gamesWon,
    p.gamesLost,
    p.points,
    p.playingTime,
  ]);

  const wsData = [['KLASEMEN LEADERBOARD ATLET TURNAMEN 🎖️'], [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  applySheetDesign(ws, 2);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
  XLSX.writeFile(wb, 'klasemen_atlet_round_robin.xlsx');
}

/**
 * Downloads ALL variables (Schedule + Scores + Leaderboards + General stats) in a Unified Workbook
 */
export function exportEntireWorkbookToExcel(players: Player[], matches: Match[], leaderboard: Player[]) {
  const wb = XLSX.utils.book_new();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Sheet 1: Players
  const playersHeaders = [
    'Nama Pemain 👤', 
    'Gender 🚻', 
    'Tingkat Kemampuan (Skill) 📈', 
    'Status Registrasi ✅'
  ];
  const playersRows = players.map((p) => [p.name, p.gender, p.skillLevel, 'Registered']);
  const wsPlayersData = [['DAFTAR ATLET REGISTERED 👥'], [], playersHeaders, ...playersRows];
  const wsPlayers = XLSX.utils.aoa_to_sheet(wsPlayersData);
  applySheetDesign(wsPlayers, 2);
  XLSX.utils.book_append_sheet(wb, wsPlayers, 'Daftar Atlet');

  // Sheet 2: Match Schedule with Score Inputs
  const schedHeaders = [
    'Round 🏆',
    'Lapangan 🏟️',
    'Tim 1 👥',
    'Skor Tim 1 🎯',
    'Skor Tim 2 🎯',
    'Tim 2 👥'
  ];
  const schedRows = matches.map((m) => {
    const t1Names = m.team1.map((id) => playerMap.get(id)?.name || id).join(' & ');
    const t2Names = m.team2.map((id) => playerMap.get(id)?.name || id).join(' & ');
    return [
      `Round ${m.round}`,
      m.courtName,
      t1Names,
      m.status === 'Completed' ? (m.score1 ?? 0) : '',
      m.status === 'Completed' ? (m.score2 ?? 0) : '',
      t2Names,
    ];
  });
  const wsSchedData = [['JADWAL & INPUT SKOR PERTANDINGAN 🎾'], [], schedHeaders, ...schedRows];
  const wsSched = XLSX.utils.aoa_to_sheet(wsSchedData);
  applySheetDesign(wsSched, 2);
  XLSX.utils.book_append_sheet(wb, wsSched, 'Jadwal & Skor Laga');

  // Sheet 3: Match Results
  const completedMatches = matches.filter((m) => m.status === 'Completed');
  const resultsHeaders = [
    'Round 🏆', 
    'Lapangan / Court 🏟️', 
    'Tim 1 👥', 
    'Skor 1 🎯', 
    'Skor 2 🎯', 
    'Tim 2 👥', 
    'Pemenang Hasil 🥇'
  ];
  const resultsRows = completedMatches.map((m) => {
    const t1Names = m.team1.map((id) => playerMap.get(id)?.name || id).join(' & ');
    const t2Names = m.team2.map((id) => playerMap.get(id)?.name || id).join(' & ');
    
    let winner = 'Draw / Seri';
    if ((m.score1 ?? 0) > (m.score2 ?? 0)) winner = 'Tim 1 (Team 1)';
    else if ((m.score2 ?? 0) > (m.score1 ?? 0)) winner = 'Tim 2 (Team 2)';

    return [
      `Round ${m.round}`,
      m.courtName,
      t1Names,
      m.score1 ?? 0,
      m.score2 ?? 0,
      t2Names,
      winner,
    ];
  });
  const wsResultsData = [['HASIL PERTANDINGAN SELESAI 🏁'], [], resultsHeaders, ...resultsRows];
  const wsResults = XLSX.utils.aoa_to_sheet(wsResultsData);
  applySheetDesign(wsResults, 2);
  XLSX.utils.book_append_sheet(wb, wsResults, 'Hasil Pertandingan');

  // Sheet 4: Leaderboard
  const leaderHeaders = [
    'Rank 🏅',
    'Nama Pemain 👤',
    'Gender 🚻',
    'Skill Level 📈',
    'Main (Matches) 🎮',
    'Menang 🏆',
    'Kalah ❌',
    'Win Rate (%) 📊',
    'Game Menang 🎾',
    'Game Kalah 📉',
    'Total Point ⭐',
    'Menit Bermain ⏱️',
  ];
  const leaderRows = leaderboard.map((p, idx) => [
    idx + 1,
    p.name,
    p.gender,
    p.skillLevel,
    p.matchesPlayed,
    p.matchesWon,
    p.matchesLost,
    `${p.winRate}%`,
    p.gamesWon,
    p.gamesLost,
    p.points,
    p.playingTime,
  ]);
  const wsLeaderData = [['KLASEMEN LEADERBOARD ATLET 🎖️'], [], leaderHeaders, ...leaderRows];
  const wsLeader = XLSX.utils.aoa_to_sheet(wsLeaderData);
  applySheetDesign(wsLeader, 2);
  XLSX.utils.book_append_sheet(wb, wsLeader, 'Leaderboard');

  // Sheet 5: Statistics
  const totalPlayers = players.length;
  const totalMatches = matches.length;
  const finishedMatches = completedMatches.length;
  const totalPlayTimeSum = completedMatches.reduce((acc, m) => acc + m.duration, 0);
  const totalUniqueCourts = Array.from(new Set(matches.map((m) => m.courtName))).length;

  const statsData = [
    ['STATISTIK RINGKASAN TURNAMEN SELURUHNYA 🚀'],
    [],
    ['Parameter Statistik 📊', 'Nilai / Skor Hasil 🔢'],
    ['Total Atlet yang Terdaftar', totalPlayers],
    ['Total Pertandingan Dijadwalkan', totalMatches],
    ['Total Pertandingan Selesai (Completed)', finishedMatches],
    ['Jumlah Lapangan (Court) Aktif', totalUniqueCourts],
    ['Total Menit Bermain Terkumulasi', `${totalPlayTimeSum} Menit`],
    ['Persentase Progress Turnamen', totalMatches > 0 ? `${Math.round((finishedMatches / totalMatches) * 100)}%` : '0%']
  ];
  const wsStats = XLSX.utils.aoa_to_sheet(statsData);
  applySheetDesign(wsStats, 2);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Analisis & Statistik');

  // Multi-Sheet complete download
  XLSX.writeFile(wb, 'laporan_turnamen_lengkap_sports.xlsx');
}
