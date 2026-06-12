import { GoogleGenAI } from "@google/genai";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
      text: "Transcribe any spoken Indonesian or English words in this audio clip exactly and literally. " +
            "Do NOT summarize, do NOT add commentaries/annotations (like 'Noise', 'Sigh', or bracketed texts). " +
            "If there are words spoken, transcribe them. If there is absolutely no speech, human voice, or only background mechanical noise, reply with absolutely nothing (empty text).",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [audioPart, textPart],
      },
    });

    const transcription = response.text || "";
    res.status(200).json({ text: transcription.trim() }); // Vercel supports standard status response
  } catch (error: any) {
    console.error("Transcription error in serverless handler:", error);
    res.status(500).json({
      error: "Gagal mentranskripsi audio.",
      details: error.message || String(error),
    });
  }
}
