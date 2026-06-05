import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import compression from "compression";
import "dotenv/config";

const app = express();
app.use(compression());
app.use(express.json());

// API Helper
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please configure GEMINI_API_KEY in your Firebase Function environment variables.');
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-functions',
      }
    }
  });
};

app.post('/gemini/generateContent', async (req, res) => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent(req.body);
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/gemini/generateContentStream', async (req, res) => {
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

// Export the Express app as a Firebase Function
// The name "api" corresponds to the function name in firebase.json
export const api = onRequest({ region: "us-central1", minInstances: 0 }, app);
