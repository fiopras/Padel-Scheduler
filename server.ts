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
