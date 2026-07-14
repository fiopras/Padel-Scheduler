import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI features. Please configure it in Vercel Environment Variables.");
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing image base64Data parameter." });
    }

    const client = getGemini();
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: any = null;
    let textResponse: string | null = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[AI Extraction] Attempting player extraction with model: ${modelName}`);
        
        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "image/png"
          }
        };

        const textPart = {
          text: `Analyze this image, which is a screenshot of the Reclub mobile app sports participants list.

CRITICAL EXTRACTION RULES:
1. Find the header indicating the count of confirmed participants (e.g., "Dikonfirmasi • 12" or "Confirmed • 12" or "Going • 12"). This count represents the exact number of active players we want to extract.
2. Extract the exact count number as "confirmed_count". For example, if it says "Dikonfirmasi • 12", confirmed_count should be 12.
3. Directly under that header, you will see a grid of circular player avatar bubbles. Directly beneath each avatar bubble is the display name of that player (written in blue/dark blue text, e.g., 'Irfan Pribadi', 'IBRA', 'Haickal', 'Fio', 'w. Adi', 'Mas Rizal', 'Bes', 'Ipank rafa', 'Fajar', 'JayR', 'Adi', 'Aziz').
4. Extract ONLY these exact names that correspond to the active/confirmed player avatars in the grid.
5. DO NOT extract names from any other sections (like waitlist, maybe, organizers, or past matches) if they exist.
6. DO NOT invent, guess, or hallucinate names. The list must match the visual count (e.g., if the header says 12, there should be exactly 12 players extracted).
7. For each player, determine or guess their gender (use "Laki-laki" for male or "Perempuan" for female). If the name is ambiguous, default to "Laki-laki".`
        };

        // Wrap the AI model call with a strict 4-second timeout to guarantee we don't hit Vercel's 10-second limit
        const aiCallPromise = client.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                confirmed_count: { type: Type.INTEGER, description: "The exact number from the header, e.g., 12" },
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
              required: ["confirmed_count", "players"]
            }
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`AI Model call timed out for ${modelName} after 4 seconds`)), 4000)
        );

        const apiResponse = await Promise.race([aiCallPromise, timeoutPromise]);

        if (apiResponse && apiResponse.text) {
          textResponse = apiResponse.text;
          console.log(`[AI Extraction] Extraction Succeeded using model: ${modelName}`);
          break; // Succeeded! Exit the loop.
        }
      } catch (err: any) {
        console.warn(`[AI Extraction] Model ${modelName} encountered an error:`, err?.message || err);
        lastError = err;
      }
    }

    if (!textResponse) {
      throw new Error(lastError?.message || "Semua model AI sedang sibuk. Silakan coba beberapa saat lagi.");
    }

    const parsed = JSON.parse(textResponse);
    const rawPlayers = parsed.players || [];
    const confirmedCount = parsed.confirmed_count || rawPlayers.length;

    const seen = new Set<string>();
    const uniquePlayers: any[] = [];
    for (const p of rawPlayers) {
      if (!p.name) continue;
      const norm = p.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        uniquePlayers.push({
          name: p.name.trim(),
          gender: p.gender === "Perempuan" ? "Perempuan" : "Laki-laki"
        });
      }
    }

    let finalPlayers = uniquePlayers;
    if (finalPlayers.length > confirmedCount) {
      console.log(`[AI Extraction] Slicing players from ${finalPlayers.length} to ${confirmedCount} based on confirmed_count`);
      finalPlayers = finalPlayers.slice(0, confirmedCount);
    }

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ players: finalPlayers });
  } catch (err: any) {
    console.error("AI player extraction completely failed:", err);
    return res.status(500).json({ error: err?.message || "Gagal mengekstrak nama pemain karena lalu lintas server padat. Silakan coba kembali." });
  }
}
