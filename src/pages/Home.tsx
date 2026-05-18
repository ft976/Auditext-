import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Play, Square, Download, Moon, Sun, Clock, Languages, ChevronDown, Check, X, Settings, AudioLines, LogIn, LogOut, User as UserIcon, ShieldCheck } from "lucide-react";
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
import { useStudio } from "../context/StudioContext";
import { useAuth, OperationType, handleFirestoreError } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, setDoc, doc, getDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

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

function SettingsPopover({ apiKeys, setApiKeys, provider, setProvider, user, login, logout }: { apiKeys: any, setApiKeys: any, provider: string, setProvider: any, user: any, login: any, logout: any }) {
  const [draftKeys, setDraftKeys] = useState(apiKeys);
  const [isVerifying, setIsVerifying] = useState<Record<string, boolean>>({});
  const [verifyStatus, setVerifyStatus] = useState<Record<string, "idle" | "success" | "error">>({});
  const [verifyMessage, setVerifyMessage] = useState<Record<string, string>>({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleVerifyAndSave = async (providerName: string) => {
    const key = draftKeys[providerName as keyof typeof draftKeys] as string;
    if (!key) {
      const newKeys = { ...apiKeys, [providerName]: "" };
      setApiKeys(newKeys);
      setVerifyStatus({ ...verifyStatus, [providerName]: "idle" });
      setVerifyMessage({ ...verifyMessage, [providerName]: "" });
      return;
    }

    setIsVerifying({ ...isVerifying, [providerName]: true });
    setVerifyStatus({ ...verifyStatus, [providerName]: "idle" });
    setVerifyMessage({ ...verifyMessage, [providerName]: "" });

    try {
      const res = await fetch("/api/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerName, apiKey: key })
      });

      if (!res.ok) {
        throw new Error(`Verification failed with status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.valid) {
        setVerifyStatus({ ...verifyStatus, [providerName]: "success" });
        setVerifyMessage({ ...verifyMessage, [providerName]: "Valid key!" });
        setApiKeys({ ...apiKeys, [providerName]: key });
      } else {
        setVerifyStatus({ ...verifyStatus, [providerName]: "error" });
        setVerifyMessage({ ...verifyMessage, [providerName]: data.error || "Invalid key" });
      }
    } catch (err: any) {
      setVerifyStatus({ ...verifyStatus, [providerName]: "error" });
      setVerifyMessage({ ...verifyMessage, [providerName]: err.message || "Failed to verify" });
    } finally {
      setIsVerifying({ ...isVerifying, [providerName]: false });
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" />}>
        <Settings className="w-5 h-5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4 pt-2">
          {/* Authentication Section */}
          <div className="space-y-3 pb-3 border-b">
            <h4 className="font-semibold leading-none text-foreground">Account</h4>
            {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || "User"} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-sm truncate font-medium">{user.email}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={logout} className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
            ) : (
                <Button variant="default" size="sm" onClick={login} className="w-full justify-start gap-2">
                  <LogIn className="w-4 h-4" />
                  Login with Google
                </Button>
            )}
          </div>
          
          <div className="space-y-2 pt-1">
            <h4 className="font-semibold leading-none">Settings</h4>
            <p className="text-sm text-muted-foreground">
              Configure your AI API Keys. Keys are stored safely in your browser.
            </p>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 border-t pt-3 pb-2">
            <div className="space-y-2 pb-3 border-b">
              <Label className="font-semibold text-foreground">Active AI Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "gemini", name: "Gemini" },
                  { id: "openai", name: "OpenAI" },
                  { id: "elevenlabs", name: "ElevenLabs" },
                  { id: "deepgram", name: "Deepgram" },
                  { id: "cartesia", name: "Cartesia" },
                  { id: "groq", name: "Groq" }
                ].map(p => {
                  const hasKey = !!apiKeys[p.id as keyof typeof apiKeys];
                  return (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      disabled={!hasKey}
                      className={cn(
                        "px-2 py-1.5 text-xs rounded-lg border transition-all text-center",
                        provider === p.id 
                          ? "border-primary bg-primary/10 font-medium text-primary shadow-sm" 
                          : hasKey 
                            ? "hover:border-primary/50 text-muted-foreground bg-muted/50"
                            : "opacity-50 cursor-not-allowed bg-muted/20 text-muted-foreground"
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {[
                { id: "gemini", label: "Google Gemini API Key", placeholder: "AIza...", link: "https://aistudio.google.com/app/apikey" },
                { id: "openai", label: "OpenAI API Key", placeholder: "sk-...", link: "https://platform.openai.com/api-keys" },
                { id: "elevenlabs", label: "ElevenLabs API Key", placeholder: "sk_...", link: "https://elevenlabs.io/" },
                { id: "deepgram", label: "Deepgram API Key", placeholder: "Token ...", link: "https://console.deepgram.com/" },
                { id: "cartesia", label: "Cartesia API Key", placeholder: "sk_...", link: "https://play.cartesia.ai/" },
                { id: "groq", label: "Groq API Key (Future Use)", placeholder: "gsk_...", link: "https://console.groq.com/keys" }
              ].map(p => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${p.id}ApiKey`}>{p.label}</Label>
                  <a href={p.link} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">Get Key</a>
                </div>
                <div className="flex gap-2">
                  <Input 
                    id={`${p.id}ApiKey`} 
                    type="password" 
                    placeholder={p.placeholder} 
                    value={draftKeys[p.id as keyof typeof draftKeys] || ""} 
                    onChange={(e) => {
                      setDraftKeys({...draftKeys, [p.id]: e.target.value});
                      setVerifyStatus({...verifyStatus, [p.id]: "idle"});
                    }} 
                  />
                  <Button 
                    variant={verifyStatus[p.id] === "success" ? "default" : "secondary"}
                    onClick={() => handleVerifyAndSave(p.id)}
                    disabled={isVerifying[p.id]}
                  >
                    {isVerifying[p.id] ? "..." : (verifyStatus[p.id] === "success" ? "Saved" : "Save")}
                  </Button>
                </div>
                <div className="min-h-[16px]">
                  {verifyStatus[p.id] === "error" && (
                      <p className="text-[10px] text-destructive tracking-tight leading-none">{verifyMessage[p.id]}</p>
                  )}
                  {verifyStatus[p.id] === "success" && (
                      <p className="text-[10px] text-green-500 tracking-tight leading-none">{verifyMessage[p.id]}</p>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Home() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const { text, setText, language, setLanguage, voice, setVoice, emotion, setEmotion, speed, setSpeed } = useStudio();
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("auditextDarkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("audio.wav");
  
  const [provider, setProvider] = useState(() => localStorage.getItem("auditextProvider") || "gemini");
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const stored = localStorage.getItem("auditextApiKeys");
      return stored ? JSON.parse(stored) : {
        gemini: localStorage.getItem("auditextCustomApiKey") || "",
        openai: "",
        elevenlabs: "",
        groq: "",
        deepgram: "",
        cartesia: ""
      };
    } catch {
      return { gemini: "", openai: "", elevenlabs: "", groq: "", deepgram: "", cartesia: "" };
    }
  });

  interface HistoryItem { id: string, text: string, voice: string, emotion: string, language: string, provider?: string }
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem("auditextHistory");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deletingId, setDeletingId] = useState<string | "all" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClearHistory = async () => {
    if (user) {
      const historyRef = collection(db, "users", user.uid, "history");
      const snapshot = await getDocs(historyRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit().catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/history`));
    } else {
      setHistory([]);
      localStorage.removeItem("auditextHistory");
    }
    setDeletingId(null);
  };

  const handleDeleteItem = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "history", id)).catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/history/${id}`));
    } else {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      localStorage.setItem("auditextHistory", JSON.stringify(newHistory));
    }
    setDeletingId(null);
  };

  // Sync user profile to Firestore
  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user?.displayName,
            photoURL: user?.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
        }
      });
    }
  }, [user]);

  // Real-time history from Firestore
  useEffect(() => {
    if (user) {
      const historyRef = collection(db, "users", user.uid, "history");
      const q = query(historyRef, orderBy("createdAt", "desc"), limit(10));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as HistoryItem[];
        setHistory(items);
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/history`));

      return () => unsubscribe();
    } else {
      try {
        const stored = localStorage.getItem("auditextHistory");
        setHistory(stored ? JSON.parse(stored) : []);
      } catch {
        setHistory([]);
      }
    }
  }, [user]);
  
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("auditextDarkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("auditextApiKeys", JSON.stringify(apiKeys));
    localStorage.setItem("auditextProvider", provider);
  }, [apiKeys, provider]);


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
        body: JSON.stringify({ text, voice, emotion, language, provider, apiKeys }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "TTS request failed");
        } else {
          throw new Error(`TTS request failed with status: ${res.status}`);
        }
      }

      const blob = await res.blob();
      console.log("Blob type:", blob.type, "size:", blob.size);
      if (blob.size === 0) throw new Error("Received empty audio blob");
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`voicestudio_${voice}_${emotion}.wav`);

      const audio = new Audio(url);
      audio.playbackRate = speed;
      audioRef.current = audio;
      
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = (e: any) => reject(new Error("Audio load error: " + (audio.error?.message || "Unknown")));
      });

      audio.onended = () => setStatus("idle");
      audio.onerror = (e: any) => {
        setStatus("idle");
        const details = audio.error ? `Code: ${audio.error.code}, Message: ${audio.error.message}` : "Unknown error";
        setErrorMsg(`Audio playback error: ${details}`);
      };

      await audio.play();
      setStatus("playing");
      
      setHistory(prev => [{ id: Date.now().toString(), text, voice, emotion, language, provider }, ...prev].slice(0, 6));

      // Save to Firestore if logged in
      if (user) {
        const historyRef = collection(db, "users", user.uid, "history");
        addDoc(historyRef, {
          text,
          voice,
          emotion,
          language,
          provider,
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/history`));
      }

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
  
  const handleSpeedAdjust = (delta: number) => {
    const newSpeed = Math.max(0.5, Math.min(2.0, speed + delta));
    setSpeed(newSpeed);
    if (audioRef.current && status === "playing") {
      audioRef.current.playbackRate = newSpeed;
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20">
            <AudioLines className="w-10 h-10 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Studio...</p>
        </motion.div>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <AudioLines className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Auditext</h1>
        </div>
        <div className="flex items-center gap-4">
          <SettingsPopover 
            apiKeys={apiKeys} 
            setApiKeys={setApiKeys} 
            provider={provider} 
            setProvider={setProvider} 
            user={user}
            login={login}
            logout={logout}
          />

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
        <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <AudioLines className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-xl tracking-tight">Auditext</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="rounded-full">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" /> Secure Access
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight">Welcome to the Studio</h2>
              <p className="text-muted-foreground text-lg">
                Where words find their voice. Sign in to start creating human-like AI audio.
              </p>
            </div>

            <Button size="lg" className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-primary/10 gap-3" onClick={login}>
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </Button>

            <div className="pt-8 grid grid-cols-2 gap-4">
               <div className="p-4 rounded-2xl bg-muted/50 border text-left">
                  <p className="text-xs font-bold text-primary mb-1 uppercase">Privacy First</p>
                  <p className="text-xs text-muted-foreground">Your API keys stay in your browser. We never see them.</p>
               </div>
               <div className="p-4 rounded-2xl bg-muted/50 border text-left">
                  <p className="text-xs font-bold text-primary mb-1 uppercase">Cloud Sync</p>
                  <p className="text-xs text-muted-foreground">Access your history from any device instantly.</p>
               </div>
            </div>
          </motion.div>
        </main>

        <footer className="py-8 bg-background border-t">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
             <div className="flex items-center gap-2 group">
                <span className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white text-[8px] font-bold transition-transform group-hover:scale-110">RA</span>
                <p>© 2026 Auditext. Crafted with ❤️ by Rehan Ahmad</p>
             </div>
             <div className="flex gap-6">
                <Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link>
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                <a href="https://www.linkedin.com/in/rehan-ahmad-863386382" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
             </div>
          </div>
        </footer>
      </div>
    );
  }

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

            <div className="flex-1 px-4 w-full flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleSpeedAdjust(-0.1)}
              >
                -
              </Button>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Speed</span>
                  <span className="font-medium">{(typeof speed === 'number' && !isNaN(speed) ? speed : 1.0).toFixed(2)}x</span>
                </div>
                <Slider
                  value={[typeof speed === 'number' && !isNaN(speed) ? speed : 1.0]}
                  min={0.5} max={2.0} step={0.05}
                  onValueChange={handleSpeedChange}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleSpeedAdjust(0.1)}
              >
                +
              </Button>
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
      
      <footer className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground font-medium">
          <div className="flex items-center gap-2 group">
            <span className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white text-[10px] font-bold shadow-sm transition-transform group-hover:scale-110">RA</span>
            <p className="leading-relaxed">Auditext. Where words find their voice.<br className="md:hidden" /> Crafted with ❤️ by <span className="text-foreground">Rehan Ahmad</span></p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <a 
              href="https://www.linkedin.com/in/rehan-ahmad-863386382?utm_source=share_via&utm_content=profile&utm_medium=member_android" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              LinkedIn
            </a>
            <a href="mailto:rehan515ahmad@gmail.com" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </footer>

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
                    deletingId === "all" ? (
                      <div className="flex items-center gap-1">
                        <Button variant="destructive" size="sm" onClick={handleClearHistory} className="text-xs">Yes, Clear</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)} className="text-xs px-1 hover:bg-transparent"><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setDeletingId("all")} className="text-xs text-destructive hover:text-destructive">Clear All</Button>
                    )
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
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2 flex-wrap flex-1 pr-4">
                            <Badge variant="secondary" className="text-[10px] capitalize">{h.voice}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{h.emotion}</Badge>
                            {h.provider && <Badge variant="outline" className="text-[10px] uppercase">{h.provider}</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-3 mb-2" title={h.text}>{h.text}</p>
                        <Button 
                          variant="secondary" size="sm" className="w-full text-xs"
                          onClick={() => {
                           setText(h.text);
                           setVoice(h.voice);
                           setEmotion(h.emotion);
                           setLanguage(h.language);
                           if (h.provider) setProvider(h.provider);
                           setShowHistory(false);
                          }}
                        >
                          Restore State
                        </Button>
                        
                        {deletingId === h.id ? (
                          <div className="absolute -top-3 -right-2 bg-background border shadow-md rounded-lg p-1 flex items-center gap-1 z-10">
                            <span className="text-[10px] px-1 font-medium text-destructive">Delete?</span>
                            <Button size="icon" variant="ghost" className="w-5 h-5 text-destructive rounded-sm" onClick={() => handleDeleteItem(h.id)}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="w-5 h-5 rounded-sm" onClick={() => setDeletingId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeletingId(h.id)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
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
