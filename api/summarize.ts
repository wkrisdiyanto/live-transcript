import { GoogleGenAI, Type } from "@google/genai";

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

    res.status(200).json(structuredSummary);
  } catch (error: any) {
    console.error("Summarization error in serverless handler:", error);
    res.status(500).json({
      error: "Gagal merangkum transkrip.",
      details: error.message || String(error),
    });
  }
}
