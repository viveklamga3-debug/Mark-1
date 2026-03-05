import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/generate", async (req, res) => {
    const { topic, tone, length, keywords, generateImage } = req.body;

    try {
      let blogContent = "";
      let heroImage = null;

      // Use Claude if key is available, otherwise fallback to Gemini
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: `Write a ${length}-word original, SEO-optimized blog post on the topic: "${topic}".
              
              Requirements:
              1. Tone: ${tone}.
              2. Keywords: Naturally incorporate these keywords: ${keywords || topic}.
              3. Structure: Use clear headings (H1 for title, H2 and H3 for subheadings).
              4. Content: Include real-world examples, statistics (if applicable), and actionable advice.
              5. AdSense-friendly: Ensure the content is safe for all audiences and high quality.
              6. Originality: Do not copy existing articles. Provide unique perspectives.
              7. FAQ: Add a comprehensive FAQ section at the end with 5-7 common questions.
              
              Format the output in clean Markdown.`,
            },
          ],
        });

        const content = response.content[0];
        if (content.type === 'text') {
            blogContent = content.text;
        }
      } else if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const textModel = "gemini-3.1-pro-preview";
        const textPrompt = `Write a ${length}-word original, SEO-optimized blog post on the topic: "${topic}".
        
        Requirements:
        1. Tone: ${tone}.
        2. Keywords: Naturally incorporate these keywords: ${keywords || topic}.
        3. Structure: Use clear headings (H1 for title, H2 and H3 for subheadings).
        4. Content: Include real-world examples, statistics (if applicable), and actionable advice.
        5. AdSense-friendly: Ensure the content is safe for all audiences and high quality.
        6. Originality: Do not copy existing articles. Provide unique perspectives.
        7. FAQ: Add a comprehensive FAQ section at the end with 5-7 common questions.
        
        Format the output in clean Markdown.`;

        const textResponse = await ai.models.generateContent({
          model: textModel,
          contents: textPrompt,
        });
        blogContent = textResponse.text || "";
      } else {
        return res.status(400).json({ error: "No AI API keys configured (Gemini or Claude)." });
      }

      // Image generation still uses Gemini if available (Claude doesn't do images directly)
      if (generateImage && process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
              heroImage = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        } catch (imgErr) {
          console.error("Image generation failed:", imgErr);
        }
      }

      res.json({ blogContent, heroImage });
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content." });
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
