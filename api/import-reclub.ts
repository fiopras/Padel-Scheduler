import dotenv from "dotenv";

dotenv.config();

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function tryExtractPlayersHeuristically(input: string) {
  const playersList: { id: string; username: string; name: string; gender: string; skillLevel: string }[] = [];
  
  const cleanText = input.replace(/<[^>]+>/g, '\n');
  const lines = cleanText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
    
  const blacklist = new Set([
    'reclub', 'reclub.co', 'confirmed', 'going', 'participants', 'join', 'leave', 'invite',
    'intermediate', 'advanced', 'beginner', 'laki-laki', 'perempuan', 'male', 'female',
    'game', 'match', 'sport', 'tennis', 'badminton', 'racket', 'home', 'profile', 'settings',
    'search', 'notifications', 'chat', 'feed', 'map', 'explore', 'create', 'event', 'events',
    'upcoming', 'past', 'members', 'atlet', 'pemain', 'rincian', 'permainan', 'detail',
    'batal', 'daftar', 'simpan', 'tambah', 'hapus', 'edit', 'logout', 'login', 'sign up',
    'sign in', 'indonesia', 'jakarta', 'bandung', 'surabaya', 'medan', 'angkatan', 'keluar',
    'masuk', 'unduh', 'upload', 'unggah', 'berkas', 'file', 'template', 'kembali', 'selanjutnya',
    'sebelumnya', 'halaman', 'bantuan', 'kontak', 'tentang', 'kebijakan', 'privasi', 'syarat',
    'ketentuan', 'hubungi', 'kami', 'hak', 'cipta', 'terpelihara', 'semua', 'populer', 'baru'
  ]);

  const seenNames = new Set<string>();
  let currentSection = 'confirmed';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    if (
      lower.includes('daftar tunggu') || 
      lower.includes('waitlist') || 
      lower.includes('interested') || 
      lower.includes('maybe') || 
      lower.includes('mungkin') || 
      lower.includes('tidak hadir') || 
      lower.includes('not going') || 
      lower.includes('undangan') || 
      lower.includes('invited') || 
      lower.includes('belum respon') ||
      lower.includes('batal') ||
      lower.includes('declined')
    ) {
      currentSection = 'skipped';
      console.log(`[Reclub Import] Heuristics: Hit stop section text "${line}". Skipping subsequent players.`);
      continue;
    }
    
    if (currentSection === 'skipped') {
      continue;
    }

    if (line.length < 2 || line.length > 40) continue;
    if (/^[0-9\s\.\,\-\#\:\/\(\)]+$/.test(line)) continue;
    
    if (blacklist.has(lower)) continue;
    if (lower.includes('reclub') || lower.includes('http') || lower.includes('.com') || lower.includes('.co')) continue;
    if (['confirmed', 'going', 'maybe', 'not going', 'waitlist', 'organizer', 'host', 'admin', 'moderator'].includes(lower)) continue;
    
    let cleanedName = line.replace(/^\d+[\.\-\s)]+/, '').trim();
    cleanedName = cleanedName.replace(/\(Confirmed\)/i, '').trim();
    cleanedName = cleanedName.replace(/\(Going\)/i, '').trim();
    cleanedName = cleanedName.replace(/\(Organizer\)/i, '').trim();
    cleanedName = cleanedName.replace(/\(Host\)/i, '').trim();
    cleanedName = cleanedName.replace(/[^a-zA-Z0-9\s\.\-\'\(\)]/g, '').trim();
    
    if (cleanedName.length < 2 || cleanedName.length > 40) continue;
    if (blacklist.has(cleanedName.toLowerCase())) continue;
    
    let gender = 'Laki-laki';
    let skillLevel = 'Intermediate';
    
    for (let j = 1; j <= 4; j++) {
      if (i + j < lines.length) {
        const nextLine = lines[i + j].toLowerCase();
        if (nextLine.includes('perempuan') || nextLine.includes('female') || nextLine.includes('wanita') || nextLine === 'f' || nextLine === 'p') {
          gender = 'Perempuan';
        } else if (nextLine.includes('laki') || nextLine.includes('male') || nextLine.includes('pria') || nextLine === 'm' || nextLine === 'l') {
          gender = 'Laki-laki';
        }
        
        if (nextLine.includes('beginner') || nextLine.includes('pemula')) {
          skillLevel = 'Beginner';
        } else if (nextLine.includes('intermediate') || nextLine.includes('menengah')) {
          skillLevel = 'Intermediate';
        } else if (nextLine.includes('advanced') || nextLine.includes('mahir')) {
          skillLevel = 'Advanced';
        }
      }
    }
    
    const norm = cleanedName.toLowerCase();
    if (!seenNames.has(norm)) {
      seenNames.add(norm);
      playersList.push({
        id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        username: cleanedName.toLowerCase().replace(/\s+/g, '_'),
        name: cleanedName,
        gender,
        skillLevel
      });
    }
  }
  return playersList;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url, rawHtml } = req.body;
    let html = "";
    let urlSlug = "";

    if (rawHtml) {
      html = rawHtml;
      console.log(`[Reclub Import] Parsing via raw HTML source payload (${rawHtml.length} chars)`);
    } else {
      if (!url) {
        return res.status(400).json({ error: "Masukkan link URL Reclub terlebih dahulu." });
      }

      let targetUrl = url.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const lowerUrl = targetUrl.toLowerCase();
      if (!lowerUrl.includes("reclub.co")) {
        return res.status(400).json({ error: "URL harus berasal dari reclub.co" });
      }

      try {
        const parsedUrl = new URL(targetUrl);
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          urlSlug = pathParts[pathParts.length - 1].toLowerCase().trim();
          console.log(`[Reclub Import] Parsed urlSlug from target URL: ${urlSlug}`);
        }
      } catch (e) {}

      console.log(`[Reclub Import] Fetching URL: ${targetUrl}`);
      
      let success = false;
      let lastErrorMsg = "";

      const fetchStrategies = [
        // 1. Google Focus Proxy (Extremely reliable bypass via Google crawler IPs)
        {
          name: "Google Focus Proxy",
          fn: async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            try {
              const cbUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `_cb=${Date.now()}`;
              const proxyUrl = `https://images-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=1&url=${encodeURIComponent(cbUrl)}`;
              const res = await fetch(proxyUrl, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (!res.ok) {
                throw new Error(`Google Proxy HTTP Status ${res.status}`);
              }
              const body = await res.text();
              if (!body || body.trim().length < 200) {
                throw new Error("Returned payload too short or empty");
              }
              if (body.includes("Cloudflare") && (body.includes("Access denied") || body.includes("security check"))) {
                throw new Error("Blocked by Cloudflare on Google proxy");
              }
              return { html: body, url: targetUrl };
            } catch (e) {
              clearTimeout(timeoutId);
              throw e;
            }
          }
        },
        // 2. Direct Fetch with Browser User-Agent
        {
          name: "Direct Fetch",
          fn: async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            try {
              const res = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                }
              });
              clearTimeout(timeoutId);
              if (!res.ok) {
                throw new Error(`HTTP Status ${res.status}`);
              }
              const body = await res.text();
              return { html: body, url: res.url };
            } catch (e) {
              clearTimeout(timeoutId);
              throw e;
            }
          }
        },
        // 3. CorsProxy.io Bypass
        {
          name: "CorsProxy.io",
          fn: async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            try {
              const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
              const res = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              clearTimeout(timeoutId);
              if (!res.ok) {
                throw new Error(`Proxy HTTP Status ${res.status}`);
              }
              const body = await res.text();
              if (body.includes("Cloudflare") && (body.includes("Access denied") || body.includes("security check"))) {
                throw new Error("Blocked by Cloudflare on proxy");
              }
              return { html: body, url: targetUrl };
            } catch (e) {
              clearTimeout(timeoutId);
              throw e;
            }
          }
        },
        // 4. AllOrigins.win Bypass
        {
          name: "AllOrigins.win",
          fn: async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            try {
              const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
              const res = await fetch(proxyUrl, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (!res.ok) {
                throw new Error(`Proxy HTTP Status ${res.status}`);
              }
              const json = await res.json() as any;
              if (!json.contents) {
                throw new Error("Empty contents from AllOrigins");
              }
              return { html: json.contents, url: targetUrl };
            } catch (e) {
              clearTimeout(timeoutId);
              throw e;
            }
          }
        },
        // 5. CodeTabs Proxy Bypass
        {
          name: "CodeTabs Proxy",
          fn: async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            try {
              const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
              const res = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              clearTimeout(timeoutId);
              if (!res.ok) {
                throw new Error(`Proxy HTTP Status ${res.status}`);
              }
              const body = await res.text();
              return { html: body, url: targetUrl };
            } catch (e) {
              clearTimeout(timeoutId);
              throw e;
            }
          }
        }
      ];

      const strategyPromises = fetchStrategies.map(async (strategy) => {
        try {
          console.log(`[Reclub Import] Triggered parallel strategy: ${strategy.name}`);
          const result = await strategy.fn();
          if (result.html && result.html.trim().length > 100) {
            console.log(`[Reclub Import] Strategy succeeded first: ${strategy.name}`);
            return result;
          }
          throw new Error(`Strategy ${strategy.name} returned empty or invalid content`);
        } catch (err: any) {
          console.warn(`[Reclub Import] Parallel strategy failed: ${strategy.name} (${err?.message || err})`);
          throw err;
        }
      });

      try {
        const result = await Promise.any(strategyPromises);
        html = result.html;
        success = true;

        if (result.url && result.url !== targetUrl) {
          console.log(`[Reclub Import] Redirected to final URL: ${result.url}`);
          try {
            const finalUrlObj = new URL(result.url);
            const pathParts = finalUrlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
              const finalSlug = pathParts[pathParts.length - 1].toLowerCase().trim();
              if (finalSlug) {
                urlSlug = finalSlug;
                console.log(`[Reclub Import] Updated urlSlug from final redirected URL: ${urlSlug}`);
              }
            }
          } catch (err) {}
        }
      } catch (aggregateError: any) {
        console.error("[Reclub Import] All concurrent strategies failed:", aggregateError);
        lastErrorMsg = "Semua proxy / link bypass gagal merespon atau diblokir oleh Cloudflare.";
      }

      if (!success) {
        return res.status(500).json({ error: `Koneksi diblokir oleh Cloudflare Reclub (${lastErrorMsg}). Batasan keamanan Cloudflare memblokir akses langsung dari server cloud (baik Vercel maupun AI Studio). Silakan klik tombol kuning "⚠️ Link Error? Gunakan Metode Paste HTML" di atas untuk menyalin langsung data halaman permainan Anda!` });
      }
    }

    let confirmedCount: number | null = null;
    const strippedHtmlForCount = html.replace(/<[^>]+>/g, ' ');
    const confirmedMatch = strippedHtmlForCount.match(/(?:Dikonfirmasi|Confirmed|Going|Hadir|Ikut)\s*[\s•·\.\-\:\(\[|*]+\s*(\d+)/i) || 
                           strippedHtmlForCount.match(/(?:Dikonfirmasi|Confirmed|Going|Hadir|Ikut)\s*\(\s*(\d+)\s*\)/i);
    if (confirmedMatch) {
      const val = parseInt(confirmedMatch[1], 10);
      if (!isNaN(val) && val > 0) {
        confirmedCount = val;
        console.log(`[Reclub Import] Text-stripped Regex detected confirmed count: ${confirmedCount}`);
      }
    }

    let htmlTitle = "";
    if (html) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        htmlTitle = decodeHTMLEntities(titleMatch[1].trim());
      }
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
      if (ogTitleMatch) {
        htmlTitle = decodeHTMLEntities(ogTitleMatch[1].trim());
      }
      console.log(`[Reclub Import] Extracted htmlTitle for scoring: "${htmlTitle}"`);
    }

    if (!urlSlug && html) {
      const ogUrlMatch = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i) ||
                         html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
      if (ogUrlMatch) {
        try {
          const parsedUrl = new URL(ogUrlMatch[1]);
          const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            urlSlug = pathParts[pathParts.length - 1].toLowerCase().trim();
            console.log(`[Reclub Import] Extracted urlSlug from HTML og:url/canonical: ${urlSlug}`);
          }
        } catch (e) {}
      }

      if (!urlSlug) {
        const mMatch = html.match(/reclub\.co\/(?:[a-z]{2}\/)?m\/([a-zA-Z0-9_-]+)/i) ||
                       html.match(/\/m\/([a-zA-Z0-9_-]+)/i);
        if (mMatch) {
          urlSlug = mMatch[1].toLowerCase().trim();
          console.log(`[Reclub Import] Broad regex extracted urlSlug from HTML links: ${urlSlug}`);
        }
      }
    }

    let match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    let rawJson = "";
    let playersList: any[] = [];
    let eventName = "Roster Hasil Ekstraksi";
    let venue = "Reclub";
    let parsedSuccessfully = false;

    if (match || (html.trim().startsWith('[') && html.trim().endsWith(']'))) {
      try {
        if (match) {
          rawJson = decodeHTMLEntities(match[1].trim());
        } else {
          rawJson = html.trim();
        }

        const parsedArray = JSON.parse(rawJson);

        if (Array.isArray(parsedArray)) {
          const length = parsedArray.length;
          const hydrated = new Array(length);

          const walk = (index: number, visited = new Set<number>()): any => {
            if (index === -1) return undefined;
            if (index < 0 || index >= length) return undefined;
            if (index in hydrated) return hydrated[index];
            if (visited.has(index)) return undefined;

            visited.add(index);
            const value = parsedArray[index];

            if (value === null || typeof value === 'undefined') {
              hydrated[index] = value;
              return value;
            }

            if (typeof value !== 'object') {
              hydrated[index] = value;
              return value;
            }

            if (Array.isArray(value)) {
              if (value.length === 2 && typeof value[0] === 'string' && ['Reactive', 'ShallowReactive', 'Ref', 'ShallowRef'].includes(value[0])) {
                const unwrapped = walk(value[1], visited);
                hydrated[index] = unwrapped;
                return unwrapped;
              }

              const arr: any[] = [];
              hydrated[index] = arr;
              for (const item of value) {
                arr.push(typeof item === 'number' && item >= 0 && item < length ? walk(item, new Set(visited)) : item);
              }
              return arr;
            }

            const obj: Record<string, any> = {};
            hydrated[index] = obj;
            for (const key of Object.keys(value)) {
              const val = value[key];
              obj[key] = (typeof val === 'number' && val >= 0 && val < length) ? walk(val, new Set(visited)) : val;
            }
            return obj;
          };

          for (let i = 0; i < length; i++) {
            walk(i);
          }

          const unifiedUsersMap: Record<string, any> = {};
          for (const item of hydrated) {
            if (!item || typeof item !== 'object') continue;

            const possibleId = item.id || item.userId || item.uid || item.referenceId || item.memberId;
            const hasName = item.name || item.username || item.firstName || item.fullName || item.displayName;
            if (possibleId && hasName && !Array.isArray(item)) {
              unifiedUsersMap[String(possibleId)] = item;
            }

            for (const key of Object.keys(item)) {
              const val = item[key];
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                const hasSubName = val.name || val.username || val.firstName || val.fullName || val.displayName;
                if (hasSubName) {
                  unifiedUsersMap[String(key)] = val;
                  const subId = val.id || val.userId || val.uid || val.referenceId || val.memberId;
                  if (subId) {
                    unifiedUsersMap[String(subId)] = val;
                  }
                }
              }
            }
          }

          console.log(`[Reclub Import] Compiled unifiedUsersMap with ${Object.keys(unifiedUsersMap).length} profiles.`);

          const meetCandidates: any[] = [];
          for (const item of hydrated) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

            const hasParticipants = (item.participants && Array.isArray(item.participants)) ||
                                    (item.members && Array.isArray(item.members)) ||
                                    (item.users && Array.isArray(item.users)) ||
                                    (item.attendees && Array.isArray(item.attendees));

            if (hasParticipants || item.sport || item.venue || item.location || item.meetCode) {
              meetCandidates.push(item);
            }
          }

          const scoredMeets: { meet: any; score: number }[] = [];
          for (const meet of meetCandidates) {
            let score = 0;
            const participants = meet.participants || meet.members || meet.users || meet.attendees || [];
            const pCount = participants.length;
            score += pCount * 15;

            const meetSlug = String(meet.slug || "").toLowerCase().trim();
            const meetId = String(meet.id || "").toLowerCase().trim();
            const meetCode = String(meet.code || meet.shortCode || meet.short_code || meet.meetCode || meet.meet_code || "").toLowerCase().trim();
            const meetName = String(meet.name || "").toLowerCase().trim();
            const normalizedName = meetName.replace(/[^a-z0-9]+/g, '-');

            if (urlSlug) {
              const cleanUrlSlug = urlSlug.toLowerCase().trim();
              if (meetCode === cleanUrlSlug || meetId === cleanUrlSlug || meetSlug === cleanUrlSlug) {
                score += 100000;
              } else if (
                (meetCode && (cleanUrlSlug.includes(meetCode) || meetCode.includes(cleanUrlSlug))) ||
                (meetId && (cleanUrlSlug.includes(meetId) || meetId.includes(cleanUrlSlug))) ||
                (meetSlug && (cleanUrlSlug.includes(meetSlug) || meetSlug.includes(cleanUrlSlug)))
              ) {
                score += 50000;
              }

              if (normalizedName === cleanUrlSlug) {
                score += 60000;
              } else if (cleanUrlSlug.includes(normalizedName) || normalizedName.includes(cleanUrlSlug)) {
                score += 30000;
              }
            }

            if (htmlTitle && meetName) {
              const normTitle = htmlTitle.toLowerCase();
              const normMeetName = meetName.toLowerCase();
              if (normTitle.includes(normMeetName) || normMeetName.includes(normTitle)) {
                score += 40000;
              }
            }

            scoredMeets.push({ meet, score });
          }

          scoredMeets.sort((a, b) => b.score - a.score);
          const foundMeet = scoredMeets.length > 0 ? scoredMeets[0].meet : null;

          if (foundMeet) {
            console.log(`[Reclub Import] Selected best meet: "${foundMeet.name || 'Unnamed'}" with score ${scoredMeets[0].score}`);
            eventName = foundMeet.name || "Pertandingan Reclub";
            if (foundMeet.venue) {
              venue = foundMeet.venue.name || foundMeet.venue || venue;
            } else if (foundMeet.location) {
              venue = foundMeet.location.name || foundMeet.location || venue;
            }

            const possibleCountKeys = ['goingCount', 'going_count', 'confirmedCount', 'confirmed_count', 'spotsFilled', 'spots_filled', 'going'];
            for (const key of possibleCountKeys) {
              const val = foundMeet[key];
              if (val !== undefined && val !== null) {
                const numVal = parseInt(val, 10);
                if (!isNaN(numVal) && numVal > 0) {
                  if (confirmedCount === null) {
                    confirmedCount = numVal;
                    console.log(`[Reclub Import] Found confirmed count in meet.${key}: ${confirmedCount}`);
                  }
                  break;
                }
              }
            }

            const participants = foundMeet.participants || foundMeet.members || foundMeet.users || foundMeet.attendees || [];
            
            for (const part of participants) {
              if (!part) continue;

              let refId = null;
              let userData = null;

              if (typeof part === 'object') {
                refId = part.referenceId || part.userId || part.id || part.memberId || part.uid;
                userData = part.user || part.profile || part.member || part.userData;
              } else if (typeof part === 'string' || typeof part === 'number') {
                refId = String(part);
              }

              if (!userData && refId) {
                userData = unifiedUsersMap[String(refId)];
              }

              let partStatus = "";
              if (part && typeof part === 'object') {
                partStatus = String(part.status || part.state || part.registrationStatus || part.registrationState || "").trim().toLowerCase();
              }

              const isNumeric = /^-?\d+$/.test(partStatus);
              if (isNumeric) {
                if (partStatus !== "1") {
                  console.log(`[Reclub Import] Nuxt: Skipping participant ${refId || 'unknown'} because numeric status is "${partStatus}"`);
                  continue;
                }
              } else if (partStatus) {
                if (['waitlist', 'waiting', 'maybe', 'interested', 'not_going', 'cancelled', 'declined', 'invited', 'pending'].includes(partStatus)) {
                  console.log(`[Reclub Import] Nuxt: Skipping participant ${refId || 'unknown'} because status is "${partStatus}"`);
                  continue;
                }
              }

              if (userData && typeof userData === 'object') {
                const username = userData.username || userData.userName || userData.handle || "";
                const firstName = userData.firstName || "";
                const lastName = userData.lastName || "";
                let name = userData.name || userData.displayName || userData.fullName || "";
                if (!name && (firstName || lastName)) {
                  name = `${firstName} ${lastName}`.trim();
                }

                let gender = "Laki-laki";
                const g = userData.gender || userData.Gender || "";
                if (typeof g === 'string') {
                  if (g === 'F' || g === 'Female' || g.toLowerCase().startsWith('p') || g.toLowerCase() === 'f') {
                    gender = "Perempuan";
                  }
                }

                let skillLevel = "Intermediate";
                const l = userData.skillLevel || userData.level || userData.Level || "";
                if (typeof l === 'string') {
                  const levelLower = l.toLowerCase();
                  if (levelLower.includes('begin') || levelLower.includes('pemula') || levelLower.includes('dasar')) {
                    skillLevel = "Beginner";
                  } else if (levelLower.includes('inter') || levelLower.includes('menengah')) {
                    skillLevel = "Intermediate";
                  } else if (levelLower.includes('adv') || levelLower.includes('mahir') || levelLower.includes('expert')) {
                    skillLevel = "Advanced";
                  }
                }

                if (name) {
                  const pId = refId || userData.id || userData.userId || name;
                  if (!playersList.some(p => p.name.toLowerCase() === name.toLowerCase() || p.id === String(pId))) {
                    playersList.push({ id: String(pId), username, name, gender, skillLevel });
                  }
                }
              } else if (part && typeof part === 'object' && (part.name || part.displayName)) {
                const name = part.name || part.displayName;
                const username = part.username || "";
                let gender = "Laki-laki";
                let skillLevel = "Intermediate";
                const pId = part.id || name;
                if (!playersList.some(p => p.name.toLowerCase() === name.toLowerCase() || p.id === String(pId))) {
                  playersList.push({ id: String(pId), username, name, gender, skillLevel });
                }
              }
            }

            parsedSuccessfully = playersList.length > 0;
          }

          if (playersList.length === 0) {
            console.log("[Reclub Import] No players found via bestMeet, executing broad payload array scan...");
            for (const item of hydrated) {
              if (Array.isArray(item)) {
                for (const sub of item) {
                  if (!sub || typeof sub !== 'object') continue;
                  const name = sub.name || sub.displayName || sub.fullName || (sub.firstName ? `${sub.firstName} ${sub.lastName || ''}`.trim() : "");
                  if (name) {
                    const pId = sub.id || sub.userId || sub.referenceId || name;
                    if (!playersList.some(p => p.name.toLowerCase() === name.toLowerCase() || p.id === String(pId))) {
                      playersList.push({
                        id: String(pId),
                        username: sub.username || "",
                        name,
                        gender: "Laki-laki",
                        skillLevel: "Intermediate"
                      });
                    }
                  }
                }
              }
            }
            if (playersList.length > 0) {
              parsedSuccessfully = true;
            }
          }
        }
      } catch (err) {
        console.warn("[Reclub Import] Nuxt parsing failed, falling back to heuristic parsing:", err);
      }
    }

    if (!parsedSuccessfully) {
      console.log("[Reclub Import] Parsing via heuristic text extractor...");
      const extracted = tryExtractPlayersHeuristically(html);
      if (extracted && extracted.length > 0) {
        playersList = extracted;
        parsedSuccessfully = true;
      }
    }

    if (!parsedSuccessfully || playersList.length === 0) {
      throw new Error("Gagal menemukan data atlet dari input yang Anda masukkan. Pastikan Anda menyalin kode sumber (View Source) atau seluruh teks halaman daftar peserta Reclub dengan benar.");
    }

    const seen = new Set<string>();
    const uniquePlayers: any[] = [];
    for (const p of playersList) {
      if (!p.name) continue;
      const norm = p.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        uniquePlayers.push(p);
      }
    }
    playersList = uniquePlayers;

    if (confirmedCount !== null && playersList.length > confirmedCount) {
      console.log(`[Reclub Import] Slicing playersList from ${playersList.length} to ${confirmedCount} based on confirmedCount (${confirmedCount})`);
      playersList = playersList.slice(0, confirmedCount);
    }

    console.log(`[Reclub Import] Successfully extracted ${playersList.length} players from "${eventName}"`);
    return res.status(200).json({
      eventName,
      venue,
      players: playersList
    });

  } catch (err: any) {
    console.error("Reclub Import Failed:", err);
    return res.status(500).json({ error: err?.message || "Gagal mengimpor data Reclub karena kesalahan server." });
  }
}
