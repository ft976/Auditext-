import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, FileText, UserCheck, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export default function Privacy() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("auditextDarkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("auditextDarkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
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
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold tracking-tight">Auditext Privacy</span>
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
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: May 18, 2026</p>
            </div>
          </div>

          <section className="space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground font-bold">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl">1. Our Commitment to Privacy</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                At Auditext, we believe in radical transparency. Our tool is built to empower creators while keeping their sensitive data (like API keys) entirely under their own control. We do not track you, we do not store your voices, and we do not sell your data.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground font-bold">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-xl">2. "Bring Your Own Key" (BYOK) Model</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Auditext is a front-end interface for third-party AI services. We do not store your API keys on our servers.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Storage:</strong> Your keys are stored in your browser's <code>localStorage</code>.</li>
                  <li><strong>Usage:</strong> Keys are only sent to the processing server during an active request to synthesize audio.</li>
                  <li><strong>Volatile Memory:</strong> Once the request is complete, the keys are discarded from the server's memory.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground font-bold">
                <UserCheck className="w-5 h-5 text-primary" />
                <h2 className="text-xl">3. Data Collection</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We do not collect personal information like your name, email, or address unless you explicitly contact us for support. Your generation history is stored locally in your browser and is never uploaded to our servers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground font-bold">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl">4. Third-Party Services</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When you use Auditext to generate audio, you are sending data to the AI provider you have selected (OpenAI, Google, ElevenLabs, etc.). Your usage is subject to their respective privacy policies and terms of service.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10">
               <h3 className="text-lg font-bold mb-2">Questions or Concerns?</h3>
               <p className="text-muted-foreground mb-4">If you have any questions about how your data is handled, feel free to reach out directly to the creator.</p>
               <a href="mailto:rehan515ahmad@gmail.com" className="text-primary font-semibold hover:underline">rehan515ahmad@gmail.com</a>
            </div>
          </section>
        </motion.div>
      </main>

      <footer className="border-t py-12 bg-white/50 dark:bg-black/20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 group text-left">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">RA</div>
            <p className="text-sm font-medium leading-relaxed">Auditext. Where words find their voice.<br className="md:hidden" /> Crafted with ❤️ by Rehan Ahmad</p>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
             <Link to="/" className="hover:text-primary transition-colors">Studio</Link>
             <Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link>
             <a href="https://www.linkedin.com/in/rehan-ahmad-863386382" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
