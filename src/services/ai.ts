import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'undefined') {
    console.warn("GEMINI_API_KEY is not set. Please add it to the 'Secrets' panel in AI Studio Settings.");
    return "";
  }
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function generateCreativeWork({
  type,
  title,
  genres,
  devices,
  prompt,
  language = "English"
}: {
  type: string;
  title: string;
  genres: string[];
  devices: string[];
  prompt: string;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a world-class creative writer specializing in ${type}. 
  Your goal is to generate a compelling piece based on the title "${title}".
  The entire work MUST be written in ${language}.
  Incorporate the following genres: ${genres.join(', ')}.
  Explicitly use these literary devices: ${devices.join(', ')}.
  ${prompt ? `Additional instructions: ${prompt}` : ''}
  
  MANDATORY REQUIREMENT:
  After writing the story, extract and generate a set of Character Cards for ALL significant characters mentioned in your work. 
  Ensure each card accurately reflects the character's traits, appearance, and motivations as established in the story.
  
  Format the output as JSON with the following structure:
  {
    "content": "the full text of the work",
    "characterCards": [
      {
        "name": "character name",
        "description": "appearance and personality traits established in the text",
        "role": "their specific role/archetype in this story"
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: "Write the work now according to the system instructions.",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          characterCards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                role: { type: Type.STRING }
              },
              required: ["name", "description", "role"]
            }
          }
        },
        required: ["content", "characterCards"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}

export async function generateResearchChapter({
  title,
  chapter,
  section,
  previousContext,
  style,
  notes,
  language = "English"
}: {
  title: string;
  chapter: string;
  section: string;
  previousContext?: string;
  style: string;
  notes?: string;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a professional academic researcher. 
  Generate the content for the section "${section}" of "${chapter}" for a research study titled "${title}".
  Academic Style: ${style}.
  Language: Write everything in ${language}.
  ${previousContext ? `Context from previous sections: ${previousContext}` : ''}
  ${notes ? `User-provided data/notes to include: ${notes}` : ''}
  
  SPECIAL INSTRUCTIONS FOR INSTRUMENTATION/QUESTIONNAIRE:
  If this section involves data collection instruments or questionnaires (e.g., "Instrument for Data Collection"):
  1. Generate a sample questionnaire relevant to the study.
  2. Explicitly state if the instrument is "Adopted" or "Adapted". PREFER "ADOPTED" by default (since the user will not be performing new validity/reliability tests).
  3. Cite the original source/author of the questionnaire clearly.
  
  Format the output as JSON with the following structure:
  {
    "content": "The generated academic content with appropriate in-text citations.",
    "citations": ["list of references used in this section"]
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: "Generate the research section now.",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          citations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["content", "citations"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}

export async function generateBiographyChapter({
  title,
  content,
  language = "English"
}: {
  title: string;
  content: string;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a ghostwriter specialized in biographies. Your task is to turn short notes into beautiful, flowing prose.
  The output MUST be written in ${language}.`;

  const prompt = `Expand on this biographical chapter. 
  Title: ${title}
  Initial notes/content: ${content}
  
  Maintain a consistent, engaging biographical tone. Write about 2-3 detailed paragraphs.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
    }
  });

  return response.text || content;
}

export async function generateBiographyTribute({
  title,
  content,
  language = "English"
}: {
  title: string;
  content: string;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a professional tribute writer. Your goal is to transform fragments of memories into soulful, honoring messages.
  The output MUST be written in ${language}.`;

  const prompt = `Expand on this tribute message. 
  Heading: ${title}
  Initial notes: ${content}
  
  The tone should be heartfelt, emotional, and celebratory. Keep it concise but meaningful (1-2 paragraphs).`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
    }
  });

  return response.text || content;
}

export async function generateAdCampaign({
  title,
  audience,
  language = "English"
}: {
  title: string;
  audience: string;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a high-conversion digital marketer specialized in book and story promotions. 
  Your goal is to write a compelling, reach-optimized ad copy for a work titled "${title}".
  Target Audience: ${audience}.
  The entire ad copy MUST be written in ${language}.
  
  Use emojis where appropriate, include hooks, and end with a strong call to action. 
  Keep it professional yet engaging for the Legacy platform feed.`;

  const response = await ai.models.generateContent({
    model,
    contents: "Generate the ad copy now.",
    config: {
      systemInstruction,
    }
  });

  return response.text || "";
}

export async function generateResearchDataset({
  title,
  objectives,
  variables,
  sampleSize = 50,
  language = "English"
}: {
  title: string;
  objectives: string[];
  variables: string[];
  sampleSize?: number;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a data scientist. Generate a synthetic research dataset (mock data) for a study titled "${title}".
  Objectives: ${objectives.join('; ')}
  Variables to include: ${variables.join(', ')}
  Sample Size: ${sampleSize} participants.
  Language: Ensure all headers, descriptions, and summaries are in ${language}.
  
  Format the output as JSON with the following structure:
  {
    "description": "Short explanation of the synthetic data distribution",
    "headers": ["Variable1", "Variable2", "..."],
    "rows": [
      ["Val1", "Val2", "..."],
      ["Val1", "Val2", "..."]
    ],
    "summaryStatistics": "A brief summary of findings based on this mock data"
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: "Generate the synthetic dataset now.",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          headers: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          summaryStatistics: { type: Type.STRING }
        },
        required: ["description", "headers", "rows", "summaryStatistics"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}

export async function generateExpertReview({
  content,
  language = "English"
}: {
  content: string;
  language?: string;
}) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a professional literary critic and writing coach. 
  Your goal is to provide a deep, expert-level analysis of the text provided by the user.
  The entire analysis MUST be written in ${language}.
  
  Evaluate the following aspects:
  1. Narrative Structure: Pacing, hooks, and plot logic.
  2. Character Development: Depth, motivations, and voice consistency.
  3. Prose & Style: Vocabulary choice, sentence rhythm, and emotional resonance.
  4. Specific Recommendations: 3 actionable steps to improve the work.
  
  Format the output as JSON with the following structure:
  {
    "overallScore": 85, (a number out of 100)
    "summary": "High-level overview of the work's quality",
    "analysis": {
      "structure": "detailed analysis of structure",
      "characters": "detailed analysis of characters",
      "style": "detailed analysis of style"
    },
    "recommendations": ["step 1", "step 2", "step 3"]
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze this text excerpt: ${content}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          analysis: {
            type: Type.OBJECT,
            properties: {
              structure: { type: Type.STRING },
              characters: { type: Type.STRING },
              style: { type: Type.STRING }
            },
            required: ["structure", "characters", "style"]
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["overallScore", "summary", "analysis", "recommendations"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}
