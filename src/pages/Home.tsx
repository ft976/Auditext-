import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Square, Download, Moon, Sun, Clock, Languages, ChevronDown, Check, X, Settings, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Japanese", "Korean", "Portuguese", "Chinese"];
const VOICES = [
  { id: "nova", name: "Nova", gender: "Female", description: "Energetic and bright", color: "bg-blue-500" },
  { id: "alloy", name: "Alloy", gender: "Neutral", description: "Versatile and clear", color: "bg-green-500" },
  { id: "echo", name: "Echo", gender: "Male", description: "Warm and round", color: "bg-orange-500" },
  { id: "fable", name: "Fable", gender: "Male", description: "British and expressive", color: "bg-indigo-500" },
  { id: "onyx", name: "Onyx", gender: "Male", description: "Deep and authoritative", color: "bg-slate-700" },
  { id: "shimmer", name: "Shimmer", gender: "Female", description: "Clear and articulate", color: "bg-purple-500" },
];

const EMOTIONS = [
  { key: "neutral", label: "Neutral", speed: 1.0, color: "bg-gray-400", description: "Clear, balanced, natural" },
  { key: "happy", label: "Happy", speed: 1.1, color: "bg-yellow-400", description: "Warm, joyful, uplifting" },
  { key: "sad", label: "Sad", speed: 0.9, color: "bg-blue-400", description: "Melancholic, gentle, quiet" },
  { key: "excited", label: "Excited", speed: 1.25, color: "bg-orange-400", description: "High energy, fast pace" },
  { key: "whispering", label: "Whispering", speed: 0.85, color: "bg-purple-400", description: "Soft, intimate, private" },
  { key: "storytelling", label: "Storytelling", speed: 0.95, color: "bg-emerald-500", description: "Warm, captivating" },
  { key: "calm", label: "Calm", speed: 0.9, color: "bg-sky-400", description: "Soothing, relaxed" },
  { key: "angry", label: "Angry", speed: 1.15, color: "bg-red-500", description: "Stern, forceful, intense" },
  { key: "fearful", label: "Fearful", speed: 1.2, color: "bg-zinc-500", description: "Trembling, nervous" },
  { key: "serious", label: "Serious", speed: 1.0, color: "bg-indigo-600", description: "Formal, authoritative" }
];

const QUOTES = [
  { text: "Words mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning.", author: "Maya Angelou" },
  { text: "The human voice is the most perfect instrument of all.", author: "Arvo Pärt" },
  { text: "A word out of season may mar a whole lifetime.", author: "Greek Proverb" }
];

function QuoteCard() {
  const [idx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [current, setCurrent] = useState(idx);

  return (
    <div className="p-6 rounded-xl bg-card border shadow-sm min-h-[160px] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col justify-center"
        >
          <p className="text-lg italic text-muted-foreground mb-4">"{QUOTES[current].text}"</p>
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold">— {QUOTES[current].author}</p>
            <Button variant="ghost" size="sm" onClick={() => setCurrent(i => (i + 1) % QUOTES.length)}>
              Next quote
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[2px] h-12 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className={cn("w-1 rounded-full", active ? "bg-primary" : "bg-primary/20")}
          animate={active ? { height: ["20%", "100%", "20%"] } : { height: "20%" }}
          transition={{
            duration: active ? 0.5 + Math.random() * 0.5 : 0,
            repeat: Infinity,
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("English");
  const [voice, setVoice] = useState("nova");
  const [emotion, setEmotion] = useState("neutral");
  const [speed, setSpeed] = useState(1.0);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [darkMode, setDarkMode] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("audio.wav");
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem("auditextCustomApiKey") || "");

  interface HistoryItem { id: string, text: string, voice: string, emotion: string, language: string }
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("auditextCustomApiKey", customApiKey);
  }, [customApiKey]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setStatus("idle");
  }, []);

  const downloadAudio = useCallback(() => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = downloadName;
    a.click();
  }, [downloadUrl, downloadName]);

  const handleSpeak = async () => {
    if (!text.trim()) return;
    stopAudio();
    setErrorMsg("");
    setStatus("loading");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, emotion, language, customApiKey }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "TTS request failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`voicestudio_${voice}_${emotion}.wav`);

      const audio = new Audio(url);
      audio.playbackRate = speed;
      audioRef.current = audio;
      
      audio.onended = () => setStatus("idle");
      audio.onerror = () => {
        setStatus("idle");
        setErrorMsg("Audio playback error");
      };

      await audio.play();
      setStatus("playing");
      
      setHistory(prev => [{ id: Date.now().toString(), text, voice, emotion, language }, ...prev].slice(0, 6));

    } catch (error: any) {
      setStatus("idle");
      setErrorMsg(error.message || "Something went wrong.");
    }
  };

  const handleEmotionSelect = (key: string, presetSpeed: number) => {
    setEmotion(key);
    setSpeed(presetSpeed);
    if (audioRef.current && status === "playing") {
      audioRef.current.playbackRate = presetSpeed;
    }
  };
  
  const handleSpeedChange = (val: number[]) => {
    setSpeed(val[0]);
    if (audioRef.current && status === "playing") {
      audioRef.current.playbackRate = val[0];
    }
  };

  const handlePauseResume = () => {
    if (!audioRef.current) return;
    if (status === "playing") {
      audioRef.current.pause();
      setStatus("paused");
    } else if (status === "paused") {
      audioRef.current.play();
      setStatus("playing");
    }
  };

  const renderHeader = () => (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <AudioLines className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Auditext</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger render={<Button variant="ghost" size="icon" />}>
              <Settings className="w-5 h-5" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure your Gemini API Key for TTS. Keys are stored safely in your browser.
                  </p>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 border-t pt-3">
                  <div className="space-y-1">
                    <Label htmlFor="apiKey">Gemini API Key</Label>
                    <Input id="apiKey" type="password" placeholder="AIza..." value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={() => setShowHistory(!showHistory)} className="relative">
            <Clock className="w-4 h-4 mr-2" />
            History
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 min-w-5">{history.length}</Badge>
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors pb-12">
      {renderHeader()}

      <main className="max-w-7xl mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 relative">
        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-card border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", status === "playing" ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
                <span className="text-sm font-medium text-muted-foreground capitalize">{status}</span>
              </div>
            </div>
            <WaveformBars active={status === "playing"} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold px-1">Script</span>
            </div>
            
            <Textarea
              className="min-h-[200px] text-lg resize-y focus-visible:ring-primary"
              placeholder="Enter text to synthesize..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 4096))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{text.split(/\s+/).filter(Boolean).length} words</span>
              <span>{text.length} / 4096 chars</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold px-1">Emotion & Tone</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {EMOTIONS.map((e) => (
                <button
                  key={e.key}
                  onClick={() => handleEmotionSelect(e.key, e.speed)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all hover-elevate",
                    emotion === e.key ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("w-2 h-2 rounded-full", e.color)} />
                    <span className="font-medium text-sm">{e.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{e.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-4 rounded-xl border">
            {status === "idle" && (
              <Button onClick={handleSpeak} size="lg" className="w-full sm:w-auto" disabled={!text.trim()}>
                <Play className="w-4 h-4 mr-2" />
                Generate & Speak
              </Button>
            )}
            
            {status === "loading" && (
              <Button disabled size="lg" className="w-full sm:w-auto">
                <span className="animate-spin mr-2">⚙</span>
                Generating...
              </Button>
            )}

            {(status === "playing" || status === "paused") && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={handlePauseResume} size="lg" className="flex-1 sm:flex-none">
                  {status === "playing" ? "Pause" : "Resume"}
                </Button>
                <Button onClick={stopAudio} variant="destructive" size="lg" className="flex-1 sm:flex-none">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            )}

            <div className="flex-1 px-4 w-full">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Speed</span>
                <span className="font-medium">{speed.toFixed(2)}x</span>
              </div>
              <Slider
                value={[speed]}
                min={0.5} max={2.0} step={0.05}
                onValueChange={handleSpeedChange}
              />
            </div>

            {downloadUrl && (
              <Button variant="outline" size="icon" onClick={downloadAudio} title="Download Audio">
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>

          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 border-l-4">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold">Voice Model</h3>
            <div className="flex flex-col gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl border transition-all text-left",
                    voice === v.id ? "border-primary bg-primary/5 shadow-sm relative overflow-hidden" : "hover:border-primary/50"
                  )}
                >
                  {voice === v.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", v.color)}>
                    {v.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{v.gender}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{v.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">Language Intent</h3>
            <div className="relative group">
              <select
                className="w-full appearance-none bg-card border rounded-xl p-3 pr-10 hover:border-primary/50 transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-foreground transition-colors">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          <QuoteCard />
        </div>
      </main>

      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                <h2 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Session History
                </h2>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setHistory([])} className="text-xs">Clear</Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {history.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground mt-10">No recent generations.</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((h, i) => (
                      <div key={h.id} className="p-3 bg-muted/50 rounded-xl border relative group">
                        <div className="flex gap-2 mb-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">{h.voice}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{h.emotion}</Badge>
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-3 mb-2">{h.text}</p>
                        <Button 
                          variant="secondary" size="sm" className="w-full text-xs"
                          onClick={() => {
                           setText(h.text);
                           setVoice(h.voice);
                           setEmotion(h.emotion);
                           setLanguage(h.language);
                           setShowHistory(false);
                          }}
                        >
                          Restore State
                        </Button>
                        <button 
                          onClick={() => setHistory(history.filter(item => item.id !== h.id))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
