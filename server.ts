import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 15MB limit to allow base64 audio uploads securely
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Lazy initializer for the Gemini client to avoid crashes if GEMINI_API_KEY is missing at start
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ---------------------- API ROUTES ----------------------

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", keyConfigured: !!process.env.GEMINI_API_KEY });
});

// Endpoint for chunk transcription using Gemini multimodal audio capability
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audio, mimeType } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "No audio data provided." });
    }
    if (!mimeType) {
      return res.status(400).json({ error: "No mimeType provided." });
    }

    const ai = getGeminiClient();

    const audioPart = {
      inlineData: {
        mimeType,
        data: audio, // base64 data
      },
    };

    const textPart = {
      text: "Transcribe the spoken Indonesian or English words in this audio clip exactly and literally. " +
            "Do NOT summarize, do NOT add comments/annotations (like 'Noise', 'Sigh', or bracketed texts), and do NOT add intro/outro speech. " +
            "If there is no speech, human voice, or only noise/silence inside the audio, reply with absolutely nothing (empty text).",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [audioPart, textPart],
      },
    });

    const transcription = response.text || "";
    res.json({ text: transcription.trim() });
  } catch (error: any) {
    console.error("Transcription error in server:", error);
    res.status(500).json({
      error: "Gagal mentranskripsi audio.",
      details: error.message || String(error),
    });
  }
});

// Endpoint for structured meet notes & summarization
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "Transcript is empty or missing." });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Harap analisis transkrip percakapan/meeting berikut dan berikan ringkasan terstruktur dalam Bahasa Indonesia.
      
Transkrip diskusi:
"""
${transcript}
"""`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Judul sesi transkrip/meeting yang menceritakan isi percakapan secara singkat dan menarik."
            },
            overview: {
              type: Type.STRING,
              description: "Ringkasan eksekutif setebal 2-4 kalimat yang merangkum keseluruhan diskusi secara komprehensif."
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-6 poin penting/inti utama yang dibahas sepanjang percakapan."
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tindak lanjut, kesepakatan, atau tugas kerja konkret yang perlu dilaksanakan selepas sesi ini berakhir."
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nama sub-topik atau tema diskusi (misalnya: Pemasaran, Kendala Teknis, Keuangan)." },
                  detail: { type: Type.STRING, description: "Rangkaian penjelasan ringkas materi yang didebatkan atau dinaungi dalam sub-topik tersebut." },
                },
                required: ["name", "detail"],
              },
              description: "Daftar sub-topik utama beserta rincian informasinya secara modular."
            }
          },
          required: ["title", "overview", "keyPoints", "actionItems", "topics"]
        }
      }
    });

    const summaryText = response.text || "{}";
    const structuredSummary = JSON.parse(summaryText.trim());

    res.json(structuredSummary);
  } catch (error: any) {
    console.error("Summarization error in server:", error);
    res.status(500).json({
      error: "Gagal merangkum transkrip.",
      details: error.message || String(error),
    });
  }
});

// ---------------------- FRONTEND ROUTING & VITE MIDDLEWARE ----------------------

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode configuration using Vite
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite development middleware");
  } else {
    // Production building and serving compiled files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server:", err);
});
