/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { 
  PenTool, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  FileText, 
  Search, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Standard');
  const [keywords, setKeywords] = useState('');
  const [generateImage, setGenerateImage] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blogPost, setBlogPost] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('architect_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const tones = ['Professional', 'Conversational', 'Technical', 'Humorous', 'Inspirational'];
  const lengths = [
    { label: 'Short', words: 600, desc: 'Quick read' },
    { label: 'Standard', words: 1200, desc: 'SEO balanced' },
    { label: 'Long', words: 2000, desc: 'Deep dive' }
  ];

  const generateBlogPost = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    setBlogPost(null);
    setHeroImage(null);

    const targetLength = lengths.find(l => l.label === length)?.words || 1200;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // 1. Generate Blog Post Text
      const textModel = "gemini-3.1-pro-preview";
      const textPrompt = `
        Write a ${targetLength}-word original, SEO-optimized blog post on the topic: "${topic}".
        
        Requirements:
        1. Tone: ${tone}. ${tone === 'Conversational' ? 'Use "I" and "you", be friendly.' : ''} ${tone === 'Technical' ? 'Focus on data, facts, and precise terminology.' : ''}
        2. Keywords: Naturally incorporate these keywords: ${keywords || topic}.
        3. Structure: Use clear headings (H1 for title, H2 and H3 for subheadings).
        4. Content: Include real-world examples, statistics (if applicable), and actionable advice.
        5. AdSense-friendly: Ensure the content is safe for all audiences and high quality.
        6. Originality: Do not copy existing articles. Provide unique perspectives.
        7. FAQ: Add a comprehensive FAQ section at the end with 5-7 common questions.
        8. Length: Aim for approximately ${targetLength} words.
        
        Format the output in clean Markdown.
      `;

      const textResponse = await ai.models.generateContent({
        model: textModel,
        contents: textPrompt,
      });

      const text = textResponse.text;
      if (!text) throw new Error("No content generated. Please try again.");
      setBlogPost(text);

      // 2. Generate Hero Image if requested
      let generatedImg = null;
      if (generateImage) {
        try {
          const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ text: `A high-quality, professional editorial hero image for a blog post about: ${topic}. Style: Modern, clean, and visually striking. No text in the image.` }],
            },
            config: {
              imageConfig: { aspectRatio: "16:9" }
            }
          });

          for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              generatedImg = `data:image/png;base64,${part.inlineData.data}`;
              setHeroImage(generatedImg);
              break;
            }
          }
        } catch (imgErr) {
          console.error("Image generation failed:", imgErr);
        }
      }

      // Save to history
      const newHistoryItem = {
        id: Date.now(),
        topic,
        tone,
        length,
        content: text,
        image: generatedImg,
        date: new Date().toLocaleDateString()
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem('architect_history', JSON.stringify(updatedHistory));

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An unexpected error occurred while generating the blog post.");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadFromHistory = (item: any) => {
    setTopic(item.topic);
    setTone(item.tone);
    setLength(item.length);
    setBlogPost(item.content);
    setHeroImage(item.image);
    setShowHistory(false);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const deleteFromHistory = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('architect_history', JSON.stringify(updated));
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsHTML = () => {
    if (!blogPost) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${topic}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
          img { max-width: 100%; border-radius: 8px; margin-bottom: 20px; }
          h1 { font-size: 2.5em; color: #000; }
          h2 { margin-top: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.5em; }
        </style>
      </head>
      <body>
        ${heroImage ? `<img src="${heroImage}" alt="Hero Image">` : ''}
        ${blogPost.replace(/\n/g, '<br>')}
      </body>
      </html>
    `;
    downloadFile(htmlContent, `${topic.toLowerCase().replace(/\s+/g, '-')}.html`, 'text/html');
  };

  const copyToClipboard = () => {
    if (blogPost) {
      navigator.clipboard.writeText(blogPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* History Sidebar Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-serif font-medium">History</h2>
              <button onClick={() => setShowHistory(false)} className="text-black/40 hover:text-black">✕</button>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-20 text-black/20">
                <FileText size={48} className="mx-auto mb-4 opacity-10" />
                <p>No history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => loadFromHistory(item)}
                    className="group p-4 rounded-2xl bg-stone-50 border border-black/5 hover:border-orange-500/50 cursor-pointer transition-all relative"
                  >
                    <button 
                      onClick={(e) => deleteFromHistory(e, item.id)}
                      className="absolute top-2 right-2 p-1 text-black/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    <p className="text-xs font-bold text-black/40 mb-1 uppercase tracking-wider">{item.date}</p>
                    <h3 className="font-bold text-sm mb-2 line-clamp-1">{item.topic}</h3>
                    <div className="flex gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-black/40 uppercase tracking-wider border border-black/5">
                        {item.tone}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-black/40 uppercase tracking-wider border border-black/5">
                        {item.length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
              <PenTool size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight">Architect</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-black/60">
            <a href="#" className="hover:text-black transition-colors">Templates</a>
            <a href="#" className="hover:text-black transition-colors">SEO Guide</a>
            <button 
              onClick={() => setShowHistory(true)}
              className="hover:text-black transition-colors flex items-center gap-2"
            >
              History
              {history.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            Professional Content Studio
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] mb-6 tracking-tight">
            Craft high-ranking <br />
            <span className="italic text-orange-500">stories</span> in seconds.
          </h1>
          <p className="text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
            Generate SEO-optimized blog posts with custom tones, 
            targeted keywords, and AI-generated hero imagery.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-3xl border border-black/5 shadow-xl shadow-black/5 p-8 mb-12">
          <div className="space-y-8">
            {/* Topic Input */}
            <div>
              <label htmlFor="topic" className="block text-sm font-bold uppercase tracking-widest text-black/40 mb-3">
                Main Topic
              </label>
              <div className="relative">
                <input
                  id="topic"
                  type="text"
                  placeholder="e.g. The Future of Sustainable Architecture in 2026"
                  className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-lg focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-black/20"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20">
                  <Search size={20} />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-black/40 mb-3">
                  Writing Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all",
                        tone === t 
                          ? "bg-black text-white" 
                          : "bg-stone-50 text-black/60 hover:bg-stone-100"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-black/40 mb-3">
                  Article Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {lengths.map((l) => (
                    <button
                      key={l.label}
                      onClick={() => setLength(l.label)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1",
                        length === l.label 
                          ? "bg-orange-500 text-white" 
                          : "bg-stone-50 text-black/60 hover:bg-stone-100"
                      )}
                    >
                      <span>{l.label}</span>
                      <span className={cn("text-[10px] opacity-60 font-medium", length === l.label ? "text-white" : "text-black/40")}>
                        ~{l.words} words
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Keywords Input */}
            <div>
              <label htmlFor="keywords" className="block text-sm font-bold uppercase tracking-widest text-black/40 mb-3">
                Target Keywords (Optional)
              </label>
              <input
                id="keywords"
                type="text"
                placeholder="keyword1, keyword2..."
                className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-black/20"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            {/* Image Toggle */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Sparkles size={18} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-bold text-sm">Generate AI Hero Image</p>
                  <p className="text-xs text-black/40">Creates a unique visual for your post</p>
                </div>
              </div>
              <button
                onClick={() => setGenerateImage(!generateImage)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  generateImage ? "bg-orange-500" : "bg-stone-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  generateImage ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <button
              onClick={generateBlogPost}
              disabled={isGenerating || !topic.trim()}
              className={cn(
                "w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                isGenerating 
                  ? "bg-stone-100 text-black/40 cursor-not-allowed" 
                  : "bg-black text-white hover:bg-stone-800 active:scale-[0.98] shadow-lg shadow-black/10"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Architecting your post...
                </>
              ) : (
                <>
                  Generate Blog Post
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-3">
              <div className="mt-0.5">⚠️</div>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {isGenerating && (
          <div className="space-y-8 animate-pulse">
            <div className="h-12 bg-stone-100 rounded-xl w-3/4 mx-auto" />
            <div className="h-64 bg-stone-100 rounded-3xl w-full" />
            <div className="space-y-4">
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-5/6" />
            </div>
          </div>
        )}

        {blogPost && (
          <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-black/40">Generated Masterpiece</h2>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-black/40 uppercase tracking-wider">
                    {tone}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-black/40 uppercase tracking-wider">
                    {length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportAsHTML}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/5 hover:bg-stone-50 transition-colors text-sm font-medium"
                >
                  <FileText size={16} />
                  Export HTML
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white hover:bg-stone-800 transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Markdown
                    </>
                  )}
                </button>
              </div>
            </div>

            <article className="bg-white rounded-[2rem] border border-black/5 shadow-2xl shadow-black/5 overflow-hidden">
              {heroImage && (
                <div className="w-full aspect-video overflow-hidden border-b border-black/5">
                  <img 
                    src={heroImage} 
                    alt="Hero" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="p-8 md:p-16 prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-h1:text-4xl md:prose-h1:text-5xl prose-h2:text-3xl prose-h2:mt-12 prose-p:text-black/80 prose-p:leading-relaxed">
                <Markdown>{blogPost}</Markdown>
              </div>
            </article>

            <div className="mt-12 text-center">
              <button
                onClick={() => {
                  setBlogPost(null);
                  setHeroImage(null);
                  setTopic('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
              >
                Start a new project
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12 mt-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-black/40">
          <p>© 2026 Gemini Blog Architect. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
