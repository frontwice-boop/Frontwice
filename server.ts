import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import "dotenv/config";
import compression from "compression";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(compression());
  app.use(express.json());
  
  // API Helper with robust environment variable fallbacks and helpful configuration instructions
  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API Key is missing. To complete setup, please add the GEMINI_API_KEY secret in the AI Studio Settings menu (Settings > Secrets) or configure the GEMINI_API_KEY environment variable in your Google Cloud Run service variables.'
      );
    }
    return new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  app.post('/api/gemini/generateContent', async (req, res) => {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent(req.body);

      // Safely extract text
      let responseText = '';
      try {
        responseText = response.text || '';
      } catch (e) {
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          responseText = parts.map((p: any) => p.text || '').join('');
        }
      }

      res.json({
        ...JSON.parse(JSON.stringify(response)),
        text: responseText
      });
    } catch (err: any) {
      console.error('generateContent error:', err);
      res.status(500).json({ 
        error: err.message,
        details: err.stack 
      });
    }
  });

  app.post('/api/gemini/generateContentStream', async (req, res) => {
    try {
      const ai = getAi();
      const stream = await ai.models.generateContentStream(req.body);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of stream) {
        let chunkText = '';
        try {
          chunkText = chunk.text || '';
        } catch (e) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (Array.isArray(parts)) {
            chunkText = parts.map((p: any) => p.text || '').join('');
          }
        }
        
        const data = {
          ...JSON.parse(JSON.stringify(chunk)),
          text: chunkText
        };
        res.write('data: ' + JSON.stringify(data) + '\n\n');
      }
      res.end();
    } catch (err: any) {
      console.error('generateContentStream error:', err);
      res.write('event: error\ndata: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    }
  });

  const isDev = process.env.NODE_ENV !== "production";

  // Vite middleware for development
  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error during server startup:", err);
  process.exit(1);
});
