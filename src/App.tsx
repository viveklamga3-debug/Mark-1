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
  const [isGenerating, setIsGenerating] = useState(false);
  const [blogPost, setBlogPost] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const generateBlogPost = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    setBlogPost(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3.1-pro-preview";

      const prompt = `
        Write a 1200-word original, SEO-optimized blog post on the topic: "${topic}".
        
        Requirements:
        1. Tone: Human-like, conversational, and engaging. Avoid "AI-speak".
        2. Structure: Use clear headings (H1 for title, H2 and H3 for subheadings).
        3. Content: Include real-world examples, statistics (if applicable), and actionable advice.
        4. AdSense-friendly: Ensure the content is safe for all audiences and high quality.
        5. Originality: Do not copy existing articles. Provide unique perspectives.
        6. SEO: Naturally incorporate keywords related to "${topic}".
        7. FAQ: Add a comprehensive FAQ section at the end with 5-7 common questions.
        8. Length: Aim for approximately 1200 words.
        
        Format the output in clean Markdown.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const text = response.text;
      if (text) {
        setBlogPost(text);
        // Scroll to result after a short delay to allow rendering
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error("No content generated. Please try again.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An unexpected error occurred while generating the blog post.");
    } finally {
      setIsGenerating(false);
    }
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
            <a href="#" className="hover:text-black transition-colors">History</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            Powered by Gemini 3.1 Pro
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] mb-6 tracking-tight">
            Craft high-ranking <br />
            <span className="italic text-orange-500">stories</span> in seconds.
          </h1>
          <p className="text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
            Generate 1,200+ word SEO-optimized blog posts that sound human, 
            engage readers, and dominate search results.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-3xl border border-black/5 shadow-xl shadow-black/5 p-8 mb-12">
          <div className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-bold uppercase tracking-widest text-black/40 mb-3">
                What's your topic?
              </label>
              <div className="relative">
                <input
                  id="topic"
                  type="text"
                  placeholder="e.g. The Future of Sustainable Architecture in 2026"
                  className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-lg focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-black/20"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateBlogPost()}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20">
                  <Search size={20} />
                </div>
              </div>
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

        {/* Features / Tips */}
        {!blogPost && !isGenerating && (
          <div className="grid md:grid-cols-3 gap-8 opacity-60">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h3 className="font-bold">1,200+ Words</h3>
              <p className="text-sm leading-relaxed">Deep-dive content that provides real value to your readers and search engines.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <Search size={18} />
              </div>
              <h3 className="font-bold">SEO Optimized</h3>
              <p className="text-sm leading-relaxed">Smart keyword placement and semantic structure for maximum visibility.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <h3 className="font-bold">Human Tone</h3>
              <p className="text-sm leading-relaxed">Conversational writing style that builds trust and keeps users reading.</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {isGenerating && (
          <div className="space-y-8 animate-pulse">
            <div className="h-12 bg-stone-100 rounded-xl w-3/4 mx-auto" />
            <div className="space-y-4">
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-5/6" />
            </div>
            <div className="h-64 bg-stone-100 rounded-3xl w-full" />
          </div>
        )}

        {blogPost && (
          <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-black/40">Generated Masterpiece</h2>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/5 hover:bg-stone-50 transition-colors text-sm font-medium"
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

            <article className="bg-white rounded-[2rem] border border-black/5 shadow-2xl shadow-black/5 p-8 md:p-16 prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-h1:text-4xl md:prose-h1:text-5xl prose-h2:text-3xl prose-h2:mt-12 prose-p:text-black/80 prose-p:leading-relaxed">
              <Markdown>{blogPost}</Markdown>
            </article>

            <div className="mt-12 text-center">
              <button
                onClick={() => {
                  setBlogPost(null);
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
