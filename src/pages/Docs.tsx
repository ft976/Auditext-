import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Cpu, ShieldCheck, Key, Zap, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export default function Docs() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("auditextDarkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("auditextDarkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 hover:bg-primary/5">
              <ArrowLeft className="w-4 h-4" />
              Back to Studio
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold tracking-tight">Auditext Docs</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="rounded-full">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Documentation</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Everything you need to know about getting started with Auditext and mastering AI voices.
          </p>

          <section className="space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Zap className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Getting Started</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Auditext is a browser-based AI voice studio. To start generating audio, you simply need to enter your text in the main workspace and click "Speak".
                </p>
                <p>
                  We support multiple providers to give you the widest variety of high-fidelity voices possible. By default, you can use our built-in capabilities, or bring your own API keys for more control.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Key className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Bringing Your Own Keys</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Auditext follows a <strong>BYOK (Bring Your Own Key)</strong> model. This gives you direct access to the lowest possible prices and advanced features from providers like:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Google Gemini:</strong> Best for high-fidelity technical and storytelling voices.</li>
                  <li><strong>OpenAI:</strong> Industry standard for clear, articulate communication.</li>
                  <li><strong>ElevenLabs:</strong> The gold standard for emotional, human-like nuance.</li>
                  <li><strong>Cartesia:</strong> ultra-low latency sonic models.</li>
                </ul>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <p className="font-semibold text-primary mb-1">How to obtain keys:</p>
                  <p>Visit the respective developer consoles of each provider. Look for the "API Key" section and ensure your billing is active.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Cpu className="w-6 h-6" />
                <h2 className="text-2xl font-bold">System Architecture</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Auditext uses a distributed architecture to process your requests safely and efficiently:
                </p>
                <ol className="list-decimal pl-6 space-y-3">
                  <li><strong>Client-Side Processing:</strong> Your keys are stored only in your browser's encrypted local storage.</li>
                  <li><strong>Secure Proxy:</strong> Requests are sent through a secure server-side proxy to handle provider-specific headers and PCM-to-WAV conversion.</li>
                  <li><strong>Real-time Streaming:</strong> Audio is streamed back to your browser as a blob, ensuring immediate playback.</li>
                </ol>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <ShieldCheck className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Safety & Integrity</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  We prioritize your security. Auditext <strong>never</strong> stores your API keys on our database. They exist solely in your browser's persistent storage. When you logout or clear your browser data, your keys are permanently removed from the application.
                </p>
              </div>
            </div>
          </section>
        </motion.div>
      </main>

      <footer className="border-t py-12 bg-white/50 dark:bg-black/20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">RA</div>
            <p className="text-sm font-medium leading-relaxed">Auditext. Where words find their voice.<br className="md:hidden" /> Crafted with ❤️ by Rehan Ahmad</p>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
             <Link to="/" className="hover:text-primary transition-colors">Studio</Link>
             <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
             <a href="https://www.linkedin.com/in/rehan-ahmad-863386382" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
