import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import { safeStringify } from "./src/lib/json";

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

const ELEVENLABS_VOICES: Record<string, string> = {
  "nova": "21m00Tcm4TlvDq8ikWAM", // Rachel
  "alloy": "29vD33N1CtxCmqQRPOHJ", // Drew
  "echo": "TX3OmvAKzWv9wSYnzzcg",  // Liam
  "fable": "2EiwWnXFnvU5JabPnv8n", // Clyde
  "onyx": "5Q0t7uMcjvnagumLfvZi",  // Paul
  "shimmer": "AZnzlk1XvdvUeBnXmlld" // Domi
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/healthz", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/verify-key", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      if (!apiKey || apiKey.trim() === "") {
        res.status(400).json({ valid: false, error: "API key is empty" });
        return;
      }

      const key = apiKey.trim();

      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${key}` }
        });
        if (response.ok) {
          res.json({ valid: true });
        } else {
          res.status(400).json({ valid: false, error: "Invalid OpenAI API Key" });
        }
        return;
      }

      if (provider === "elevenlabs") {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": key }
        });
        if (response.ok) {
          res.json({ valid: true });
        } else {
          res.status(400).json({ valid: false, error: "Invalid ElevenLabs API Key" });
        }
        return;
      }

      if (provider === "groq") {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { "Authorization": `Bearer ${key}` }
        });
        if (response.ok) {
          res.json({ valid: true });
        } else {
          res.status(400).json({ valid: false, error: "Invalid Groq API Key" });
        }
        return;
      }

      if (provider === "deepgram") {
        const response = await fetch("https://api.deepgram.com/v1/projects", {
          headers: { "Authorization": `Token ${key}` }
        });
        if (response.ok) {
          res.json({ valid: true });
        } else {
          res.status(400).json({ valid: false, error: "Invalid Deepgram API Key" });
        }
        return;
      }

      if (provider === "cartesia") {
        const response = await fetch("https://api.cartesia.ai/voices", {
          headers: { "X-API-Key": key, "Cartesia-Version": "2024-06-10" }
        });
        if (response.ok) {
          res.json({ valid: true });
        } else {
          res.status(400).json({ valid: false, error: "Invalid Cartesia API Key" });
        }
        return;
      }

      if (provider === "gemini") {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (response.ok) {
          res.json({ valid: true });
        } else {
          res.status(400).json({ valid: false, error: "Invalid Gemini API Key" });
        }
        return;
      }

      res.status(400).json({ valid: false, error: "Unknown provider" });
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "nova", emotion = "neutral", provider = "gemini", apiKeys = {} } = req.body;
      
      if (!text || text.trim().length === 0) {
        res.status(400).json({ error: "Text is required" });
        return;
      }
      
      if (text.length > 4096) {
        res.status(400).json({ error: "Text exceeds 4096 characters" });
        return;
      }

      if (provider === "openai") {
        const apiKey = apiKeys.openai?.trim();
        if (!apiKey) {
          res.status(400).json({ error: "OpenAI API Key is required for OpenAI provider. Please configure it in Settings." });
          return;
        }

        const openAiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: safeStringify({
            model: "tts-1",
            input: text,
            voice: voice,
            response_format: "wav",
          })
        });

        if (!openAiResponse.ok) {
          const err = await openAiResponse.json().catch(() => ({}));
          throw new Error(err.error?.message || "Failed to generate speech with OpenAI");
        }

        const audioBuffer = await openAiResponse.arrayBuffer();
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", audioBuffer.byteLength.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.send(Buffer.from(audioBuffer));
        return;
      }

      if (provider === "elevenlabs") {
        const apiKey = apiKeys.elevenlabs?.trim();
        if (!apiKey) {
          res.status(400).json({ error: "ElevenLabs API Key is required for ElevenLabs provider. Please configure it in Settings." });
          return;
        }

        const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES["nova"];

        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_16000`, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json"
          },
          body: safeStringify({
            text: text,
            model_id: "eleven_multilingual_v2",
          })
        });

        if (!elevenLabsResponse.ok) {
          const err = await elevenLabsResponse.json().catch(() => ({}));
          throw new Error(err.detail?.message || err.detail || "Failed to generate speech with ElevenLabs");
        }

        let audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());
        
        // Output from elevenlabs is PCM, need to add WAV header
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);

        const header = Buffer.alloc(44);
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

        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", audioBuffer.byteLength.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.send(audioBuffer);
        return;
      }

      if (provider === "groq") {
        res.status(400).json({ error: "Groq does not currently support text-to-speech API natively in this application. Please use Gemini, OpenAI, or ElevenLabs." });
        return;
      }

      if (provider === "deepgram") {
        const apiKey = apiKeys.deepgram?.trim();
        if (!apiKey) {
          res.status(400).json({ error: "Deepgram API Key is required. Please configure it in Settings." });
          return;
        }

        const deepgramVoices: Record<string, string> = {
          "nova": "aura-luna-en",
          "alloy": "aura-orion-en",
          "echo": "aura-arcas-en",
          "fable": "aura-helios-en",
          "onyx": "aura-angus-en",
          "shimmer": "aura-stella-en"
        };
        const voiceId = deepgramVoices[voice] || "aura-asteria-en";

        const response = await fetch(`https://api.deepgram.com/v1/speak?model=${voiceId}`, {
          method: "POST",
          headers: {
            "Authorization": `Token ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: safeStringify({ text })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.err_msg || err.error || "Failed to generate speech with Deepgram");
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", audioBuffer.byteLength.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.send(Buffer.from(audioBuffer));
        return;
      }

      if (provider === "cartesia") {
        const apiKey = apiKeys.cartesia?.trim();
        if (!apiKey) {
          res.status(400).json({ error: "Cartesia API Key is required. Please configure it in Settings." });
          return;
        }

        const cartesiaVoices: Record<string, string> = {
          "nova": "79a125e8-cd45-4c13-8a67-188112f4dd22",
          "alloy": "694f9389-aac1-45b6-b726-9d9369183238",
          "echo": "a0e99841-438c-4a64-b6a9-fe2dc6bf71f7",
          "fable": "b7d50908-b17c-442d-ad8d-810c63997ed9",
          "onyx": "5c34120c-a075-4cd9-bd0f-21fb94d0b135",
          "shimmer": "95856005-0332-41b0-935f-352e298000fe"
        };
        const voiceId = cartesiaVoices[voice] || "a0e99841-438c-4a64-b6a9-fe2dc6bf71f7";

        const response = await fetch(`https://api.cartesia.ai/tts/bytes`, {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
            "Cartesia-Version": "2024-06-10",
            "Content-Type": "application/json"
          },
          body: safeStringify({
            transcript: text,
            model_id: "sonic-english",
            voice: { mode: "id", id: voiceId },
            output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: 16000 }
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || "Failed to generate speech with Cartesia");
        }

        let audioBuffer = Buffer.from(await response.arrayBuffer());
        
        // Cartesia returns raw PCM. Wrap in WAV header.
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);

        const header = Buffer.alloc(44);
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

        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", audioBuffer.byteLength.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.send(audioBuffer);
        return;
      }

      // Default to Gemini
      let activeAi: GoogleGenAI | null = null;
      const customApiKey = apiKeys.gemini?.trim();
      
      if (customApiKey && customApiKey.length > 0) {
        activeAi = new GoogleGenAI({
          apiKey: customApiKey,
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
        res.status(400).json({ error: "No Gemini API key configured. Please configure it in Settings." });
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
