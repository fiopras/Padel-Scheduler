import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI features. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set higher body limits to allow base64 screenshot uploads
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // Server-side AI Extraction API endpoint with multi-model fallback resiliency
  app.post("/api/extract-players", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing image base64Data parameter." });
      }

      const client = getGemini();

      // List of highly compatible models to try sequentially in case of 503/peak demand errors
      const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash", "gemini-1.5-pro"];
      let lastError: any = null;
      let textResponse: string | null = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`[AI Extraction] Attempting player extraction with model: ${modelName}`);
          const apiResponse = await client.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || "image/png"
                }
              },
              {
                text: `Analyze this image which is a screenshot from the Reclub mobile app showing a list of sports players/participants under a section like 'CONFIRMED' or 'REQUESTED'. 
Extract all the unique, clean display names of the athletes/players shown (for example, names like: 'JayR', 'w. Adi', 'IBRA', 'Mas Rizal', 'Fio', 'Samy', 'Adhe Fitri', 'Ipank rafa', 'Fajar', 'Aziz', 'Firman', 'Haickal'). 

Only extract active names of participants. Do NOT include numbers like count labels (e.g., '12/14' or '94'), status headers, time headers (e.g., '18.19', '7:00 PM'), utility icons, or standard system tags/subtitles like 'Friend' or 'Langkah'. 

Make sure to clean the names, remove duplicate characters or trailing spaces, and infer their gender if their name suggests it (use "Laki-laki" which counts for males, or "Perempuan" for females). If you cannot guess with certainty, default the gender to "Laki-laki".`
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  players: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        gender: { type: Type.STRING, description: "Must be 'Laki-laki' or 'Perempuan'" }
                      },
                      required: ["name", "gender"]
                    }
                  }
                },
                required: ["players"]
              }
            }
          });

          if (apiResponse && apiResponse.text) {
            textResponse = apiResponse.text;
            console.log(`[AI Extraction] Extraction Succeeded using model: ${modelName}`);
            break; // Succeeded! Exit the loop.
          }
        } catch (err: any) {
          console.warn(`[AI Extraction] Model ${modelName} encountered an error:`, err?.message || err);
          lastError = err;
          // Continue loop to try next fallback model
        }
      }

      if (!textResponse) {
        throw new Error(lastError?.message || "Semua model AI sedang sibuk. Silakan coba beberapa saat lagi.");
      }

      res.setHeader("Content-Type", "application/json");
      res.send(textResponse);
    } catch (err: any) {
      console.error("AI player extraction completely failed:", err);
      res.status(500).json({ error: err?.message || "Gagal mengekstrak nama pemain karena lalu lintas server padat. Silakan coba kembali." });
    }
  });

  // HTML entity decoder helper for script tags
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

  // Server-side Reclub scrap-and-import API endpoint
  app.post("/api/import-reclub", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing Reclub url parameter." });
      }

      const lowerUrl = url.toLowerCase();
      if (!lowerUrl.includes("reclub.co")) {
        return res.status(400).json({ error: "URL harus berasal dari reclub.co" });
      }

      console.log(`[Reclub Import] Fetching URL: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil data dari Reclub: HTTP ${response.status}`);
      }

      const html = await response.text();

      // Search for <script id="__NUXT_DATA__">
      const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      if (!match) {
        throw new Error("Gagal menemukan data silsilah permainan (__NUXT_DATA__) dari Reclub. Pastikan URL benar dan publik.");
      }

      const rawJson = decodeHTMLEntities(match[1].trim());
      const parsedArray = JSON.parse(rawJson);

      if (!Array.isArray(parsedArray)) {
        throw new Error("Format data __NUXT_DATA__ tidak valid (bukan array).");
      }

      // Unflatten the Nuxt data array
      const length = parsedArray.length;
      const hydrated = new Array(length);

      function walk(index: number, visited = new Set<number>()): any {
        if (index === -1) return undefined;
        if (index < 0 || index >= length) return undefined;
        if (index in hydrated) return hydrated[index];
        if (visited.has(index)) return undefined; // circular ref block

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

        // Check if it's a wrapper array (like Vue Reactive/Ref wrapper)
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

        // Object
        const obj: Record<string, any> = {};
        hydrated[index] = obj;
        for (const key of Object.keys(value)) {
          const val = value[key];
          obj[key] = (typeof val === 'number' && val >= 0 && val < length) ? walk(val, new Set(visited)) : val;
        }
        return obj;
      }

      // Walk all indices to hydrate
      for (let i = 0; i < length; i++) {
        walk(i);
      }

      // Find the meet details and usersMap tree
      let foundMeet: any = null;
      let foundUsersMap: any = null;

      for (const item of hydrated) {
        if (!item || typeof item !== 'object') continue;

        // Form A: Sibling relation (wrapper has 'meet' and 'usersMap')
        if (item.meet && typeof item.meet === 'object' && item.usersMap && typeof item.usersMap === 'object') {
          foundMeet = item.meet;
          foundUsersMap = item.usersMap;
          break;
        }

        // Form B: Single relation (item has BOTH 'participants' and 'usersMap')
        if (item.participants && Array.isArray(item.participants) && item.usersMap && typeof item.usersMap === 'object') {
          foundMeet = item;
          foundUsersMap = item.usersMap;
          break;
        }
      }

      // Helper fallback deep scan
      if (!foundMeet || !foundUsersMap) {
        for (const item of hydrated) {
          if (!item || typeof item !== 'object') continue;
          for (const key of Object.keys(item)) {
            const sub = item[key];
            if (sub && typeof sub === 'object') {
              if (sub.meet && typeof sub.meet === 'object' && sub.usersMap && typeof sub.usersMap === 'object') {
                foundMeet = sub.meet;
                foundUsersMap = sub.usersMap;
                break;
              }
              if (sub.participants && Array.isArray(sub.participants) && sub.usersMap && typeof sub.usersMap === 'object') {
                foundMeet = sub;
                foundUsersMap = sub.usersMap;
                break;
              }
            }
          }
          if (foundMeet && foundUsersMap) break;
        }
      }

      // Absolute fallback if they are entirely separate in state
      if (!foundMeet || !foundUsersMap) {
        let potentialUsersMap: any = null;
        let potentialMeet: any = null;
        for (const item of hydrated) {
          if (!item || typeof item !== 'object') continue;
          if (!potentialUsersMap && item.usersMap && typeof item.usersMap === 'object') {
            potentialUsersMap = item.usersMap;
          }
          if (!potentialMeet && item.participants && Array.isArray(item.participants)) {
            potentialMeet = item;
          }
        }
        if (potentialMeet && potentialUsersMap) {
          foundMeet = potentialMeet;
          foundUsersMap = potentialUsersMap;
        }
      }

      if (!foundMeet || !foundUsersMap) {
        throw new Error("Gagal menemukan details pertandingan atau roster pemain ('meet'/'usersMap') di dalam data Reclub.");
      }

      const eventName = foundMeet.name || "Pertandingan Reclub";
      let venue = "Venue Reclub";
      if (foundMeet.venue) {
        venue = foundMeet.venue.name || foundMeet.venue || venue;
      } else if (foundMeet.location) {
        venue = foundMeet.location.name || foundMeet.location || venue;
      }

      const players: { id: string; username: string; name: string; gender: string; skillLevel: string }[] = [];

      if (foundMeet.participants && Array.isArray(foundMeet.participants)) {
        for (const part of foundMeet.participants) {
          if (!part || typeof part !== 'object') continue;

          const refId = part.referenceId || part.userId || part.id || part.memberId;
          if (!refId) continue;

          const userData = foundUsersMap[refId] || foundUsersMap[String(refId)];
          if (userData) {
            const username = userData.username || userData.userName || userData.handle || "";
            const firstName = userData.firstName || "";
            const lastName = userData.lastName || "";
            let name = userData.name || userData.displayName || userData.fullName || "";
            if (!name && (firstName || lastName)) {
              name = `${firstName} ${lastName}`.trim();
            }

            // Detect gender
            let gender = "Laki-laki";
            const g = userData.gender || userData.Gender || "";
            if (typeof g === 'string') {
              if (g === 'F' || g === 'Female' || g.toLowerCase().startsWith('p') || g.toLowerCase() === 'f') {
                gender = "Perempuan";
              }
            }

            // Customize skill level placeholder
            let skillLevel = "Intermediate";

            players.push({
              id: String(refId),
              username: String(username),
              name: String(name || username || "Tanpa Nama"),
              gender,
              skillLevel
            });
          }
        }
      }

      console.log(`[Reclub Import] Extracted ${players.length} players from "${eventName}" at "${venue}"`);
      res.json({
        eventName,
        venue,
        players
      });

    } catch (err: any) {
      console.error("Reclub Import Failed:", err);
      res.status(500).json({ error: err?.message || "Gagal mengimpor data Reclub karena kesalahan server." });
    }
  });

  // Serve static dist folder in production, or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cotta Master] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
