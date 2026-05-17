import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

const getAiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const EMOTION_SYSTEM_PROMPTS: Record<string, string> = {
  "neutral": "You are a professional voice actor. Read the text with a clear, balanced, and natural tone.",
  "happy": "You are a professional voice actor. Read the text with a genuinely warm, joyful, bright, and uplifting tone — like someone sharing wonderful news.",
  "sad": "You are a professional voice actor. Read the text with a melancholic, gentle, and quiet tone.",
  "excited": "You are a professional voice actor. Read the text with high energy, enthusiasm, and a fast pace.",
  "whispering": "You are a professional voice actor. Read the text very softly and intimately, as if whispering a secret close to someone's ear — hushed, slow, private.",
  "storytelling": "You are a professional voice actor. Read the text with a warm, captivating storytelling voice — draw the listener in, vary your pace, build presence.",
  "calm": "You are a professional voice actor. Read the text with a soothing, slow, and relaxed tone.",
  "angry": "You are a professional voice actor. Read the text with a stern, forceful, and intense tone.",
  "fearful": "You are a professional voice actor. Read the text with a trembling, nervous, and hesitant tone.",
  "serious": "You are a professional voice actor. Read the text with a formal, authoritative, and direct tone."
};

const VOICE_ID_TO_GEMINI_VOICE: Record<string, string> = {
  "nova": "Kore",
  "alloy": "Zephyr",
  "echo": "Fenrir",
  "fable": "Puck",
  "onyx": "Charon",
  "shimmer": "Kore" // Re-used to match the 6
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/healthz", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "nova", emotion = "neutral", customApiKey } = req.body;
      
      if (!text || text.trim().length === 0) {
        res.status(400).json({ error: "Text is required" });
        return;
      }
      
      if (text.length > 4096) {
        res.status(400).json({ error: "Text exceeds 4096 characters" });
        return;
      }

      let activeAi: GoogleGenAI | null = null;
      if (customApiKey && customApiKey.trim().length > 0) {
        activeAi = new GoogleGenAI({
          apiKey: customApiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } else {
        activeAi = getAiClient();
      }

      if (!activeAi) {
        res.status(400).json({ error: "No API key configured. Please configure your Gemini API Key in Settings." });
        return;
      }

      const geminiVoice = VOICE_ID_TO_GEMINI_VOICE[voice] || "Kore";
      const systemPrompt = EMOTION_SYSTEM_PROMPTS[emotion] || EMOTION_SYSTEM_PROMPTS["neutral"];
      
      const promptText = `Instructions: ${systemPrompt}\n\nText to read: ${text}`;

      const response = await activeAi.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: geminiVoice },
              },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData || !inlineData.data) {
        throw new Error("No audio returned from model");
      }

      let audioBuffer = Buffer.from(String(inlineData.data), "base64");
      let contentType = inlineData.mimeType || "audio/wav";

      // If the model returns raw PCM, we must add a WAV header for the browser to play it
      // Some API responses may not specify audio/pcm explicitly or we may default to audio/wav,
      // so let's check for the "RIFF" signature.
      if (!audioBuffer.slice(0, 4).equals(Buffer.from("RIFF"))) {
        let sampleRate = 24000; // default for Gemini TTS
        const rateMatch = contentType.match(/rate=(\d+)/);
        if (rateMatch) {
          sampleRate = parseInt(rateMatch[1], 10);
        }

        const header = Buffer.alloc(44);
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);

        header.write("RIFF", 0);
        header.writeUInt32LE(audioBuffer.length + 36, 4);
        header.write("WAVE", 8);
        header.write("fmt ", 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write("data", 36);
        header.writeUInt32LE(audioBuffer.length, 40);

        audioBuffer = Buffer.concat([header, audioBuffer]);
        contentType = "audio/wav";
      }
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", audioBuffer.byteLength.toString());
      res.setHeader("Cache-Control", "no-cache");
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("TTS error:", error);
      if (error.status === 429 || (error.message && error.message.includes("429"))) {
        res.status(429).json({ error: "Gemini API quota exceeded. Please configure your own Gemini API key in Settings (top right)." });
      } else {
        res.status(500).json({ error: "Failed to generate speech: " + (error.message || "Unknown error") });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
