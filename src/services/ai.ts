import { getAi, MODEL_NAME, TOOLS, ThinkingLevel } from "../lib/gemini";
import { Type } from "@google/genai";
import { safeJsonParse } from "../lib/jsonParser";

function cleanStreamedString(raw: string): string {
  if (!raw) return "";
  try {
    // Try to parse it as a JSON string literal.
    // We add a quote, the raw string, then check for trailing backslash to avoid errors.
    let toParse = '"' + raw;
    if (toParse.endsWith('\\') && !toParse.endsWith('\\\\')) {
      toParse = toParse.slice(0, -1);
    }
    toParse += '"';
    return JSON.parse(toParse);
  } catch {
    // Fallback to manual cleaning
    return raw
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\r/g, '\r')
      .replace(/\\f/g, '\f')
      .replace(/\\b/g, '\b');
  }
}

export async function generateCreativeWork(options: any, onChunk?: (chunk: any) => void) {
  const { type, title, genres, devices, prompt, language = "English" } = options;
  const ai = getAi();

  const isResearch = type.toLowerCase() === 'research';
  const role = isResearch 
    ? 'world-class academic researcher and writer specializing in creative research and interdisciplinary science communication'
    : `world-class creative writer specializing in ${type}`;
  const deviceLabel = isResearch ? 'research methodologies' : 'literary devices';
  const cardsLabel = isResearch ? 'Key Concepts / Core Researchers' : 'Character Cards';
  const cardsDesc = isResearch 
    ? 'key conceptual entities, variables, methodology stages, or prominent researchers' 
    : 'ALL significant characters';
  const traitsDesc = isResearch 
    ? 'scientific description, conceptual importance, and function' 
    : 'appearance and personality traits established in the text';
  const roleDesc = isResearch 
    ? 'their role or function in this study (e.g. Independent Variable, Subject Archetype, Principal Theory)' 
    : 'their specific role/archetype in this story';

  const systemInstruction = `You are a ${role}. 
  Your goal is to generate a compelling and highly informative/creative piece based on the title "${title}".
  The entire work MUST be written in ${language}.
  Incorporate the following subject/genre focus areas: ${(genres || []).join(', ')}.
  Explicitly integrate these ${deviceLabel}: ${(devices || []).join(', ')}.
  ${prompt ? `Additional instructions: ${prompt}` : ''}
  
  MANDATORY REQUIREMENT:
  After writing the story, extract and generate a set of Story and Character Cards for ${cardsDesc} mentioned or utilized in your work. 
  Each "Character Card" must have a name, description, and role.
  
  Format the output as JSON with the following structure:
  {
    "story": "the full text of the work",
    "characterCards": [
      {
        "name": "name of concept or character",
        "description": "${traitsDesc}",
        "role": "${roleDesc}"
      }
    ]
  }`;

  const config = {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        story: { type: Type.STRING },
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
      required: ["story", "characterCards"]
    }
  };

  if (onChunk) {
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: "Generate the story and character cards now." }] }],
      config
    });

    let fullText = "";
    let accumulatedContent = "";
    let accumulatedCards: any[] = [];
    for await (const chunk of result) {
      if (chunk.text) {
        fullText += chunk.text;
        
        // Handle potential thought blocks during streaming
        let processable = fullText;
        if (processable.includes('</thought>')) {
          processable = processable.split('</thought>').pop()?.trim() || processable;
        }

        // Extract string values robustly, supporting multi-line
        let match = processable.match(/"?(?:story|content|biography|prose|text|research|essay)"?\s*:\s*"(.*)/is);
        if (match && match[1]) {
          let unparsed = match[1];
          let endIdx = -1;
          for (let i = 0; i < unparsed.length; i++) {
              if (unparsed[i] === '"' && (i === 0 || unparsed[i-1] !== '\\')) {
                  endIdx = i;
                  break;
              }
          }
          if (endIdx !== -1) {
             unparsed = unparsed.substring(0, endIdx);
          }
          accumulatedContent = cleanStreamedString(unparsed);
        }
        
        let characterCards: any[] = [];
        try {
          // Look for characterCards list
          const cardsRegex = /"?(?:characterCards|concepts|entities|stages)"?\s*[:=]\s*\[([\s\S]*?)\]/i;
          const partialCardsRegex = /"?(?:characterCards|concepts|entities|stages)"?\s*[:=]\s*\[([\s\S]*)/i;
          
          const cardsMatch = processable.match(cardsRegex) || processable.match(partialCardsRegex);
          if (cardsMatch && cardsMatch[1]) {
             let cardsStr = cardsMatch[1].trim();
             if (!cardsStr.endsWith(']')) {
                const lastBrace = cardsStr.lastIndexOf('}');
                if (lastBrace !== -1) {
                   cardsStr = cardsStr.substring(0, lastBrace + 1) + ']';
                } else {
                   cardsStr = "";
                }
             }
             if (cardsStr) {
               try {
                 characterCards = JSON.parse(cardsStr.startsWith('[') ? cardsStr : '[' + cardsStr);
               } catch (e) {
                 try { 
                   characterCards = JSON.parse('[' + cardsStr.replace(/,\s*$/, '').replace(/,\s*([\]}])/g, '$1') + ']'); 
                 } catch (e2) {}
               }
               if (characterCards.length > 0) {
                 accumulatedCards = characterCards;
               }
             }
          }
        } catch(e) {}

        onChunk({
          content: accumulatedContent || (processable.length > 50 && !processable.trim().startsWith('{') ? processable : undefined),
          characterCards: accumulatedCards.length > 0 ? accumulatedCards : undefined
        });
      }
    }
    
    try {
      const data = safeJsonParse(fullText);
      if (data && typeof data === 'object') {
        const content = data.story || data.content || data.text || data.essay || data.biography || data.prose || accumulatedContent || fullText;
        return {
          ...data,
          content // Normalize to 'content' for component compatibility
        };
      } else {
        return {
          content: accumulatedContent || fullText,
          characterCards: accumulatedCards
        };
      }
    } catch (e) {
      console.error("Failed to parse streamed creative work AI response:", fullText, e);
      return {
        content: accumulatedContent || fullText,
        characterCards: accumulatedCards
      };
    }
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: "Generate the story and character cards now." }] }],
    config
  });

  const text = response.text || "{}";
  try {
    const data = safeJsonParse(text);
    if (data && typeof data === 'object') {
      const content = data.story || data.content || data.text || data.essay || data.biography || data.prose || text;
      return {
        ...data,
        content
      };
    } else {
      return {
        content: text,
        characterCards: []
      };
    }
  } catch (e) {
    console.error("Failed to parse AI response:", text, e);
    return {
      content: text,
      characterCards: []
    };
  }
}


export async function generateResearchChapter(options: any, onChunk?: (chunk: any) => void) {
  const { title, chapter, section, previousContext, style, notes, language = "English" } = options;
  const ai = getAi();

  const systemInstruction = `You are a professional academic researcher. 
  Generate the content for the section "${section}" of "${chapter}" for a research study titled "${title}".
  Academic Style: ${style}.
  Language: Write everything in ${language}.
  ${previousContext ? `Context from previous sections: ${previousContext}` : ''}
  ${notes ? `User-provided data/notes to include: ${notes}` : ''}
  
  SPECIAL INSTRUCTIONS FOR INSTRUMENTATION/QUESTIONNAIRE & TESTS:
  If this section involves data collection instruments, questionnaires, or tests (e.g., "Instrument for Data Collection", "Pre-Test/Post-Test"):
  1. Generate a comprehensive sample questionnaire or test paper specifically tailored and highly relevant to the study's topic: "${title}".
  2. For Tests: Include a mix of multiple-choice, Likert scale, and open-ended questions.
  3. You MUST explicitly state that the instrument is an "Adopted questionnaire/test". Do not use adapted or self-developed.
  4. Provide a realistic (even if mock) citation for the original source/author of the adopted instrument.

  SPECIAL INSTRUCTIONS FOR DATA ANALYSIS / PRESENTATION:
  If this section involves data analysis, findings, or presentation (e.g., "Data Analysis", "Data Presentation", "Discussion of Findings"):
  1. Produce mock statistical analyses including p-values (e.g., p < 0.05 or p < 0.01) and regression results.
  2. Synthesize and format data clearly utilizing markdown tables.
  3. Detail where and how visual summaries should be placed using pie charts (e.g. by explicitly typing "[Insert Pie Chart: ...]" or describing the pie chart's data breakdown).

  SPECIAL INSTRUCTIONS FOR OBJECTIVES:
  If this section is "Objectives of the Study" or deals with study objectives:
  1. Explicitly formulate one clear "Main Objective" for the research based on the title.
  2. Generate 3-5 "Specific Objectives" that break down the main objective into measurable, achievable steps.
  
  Format the output as JSON with the following structure:
  {
    "content": "The generated academic content with appropriate in-text citations. Use Markdown for layout.",
    "citations": ["list of references used in this section"],
    "mainObjective": "string",
    "specificObjectives": ["string", "string"]
  }`;

  const config = {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        citations: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        mainObjective: { type: Type.STRING },
        specificObjectives: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["content", "citations"]
    }
  };

  if (onChunk) {
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: "Generate the research section now." }] }],
      config
    });

    let fullText = "";
    let accumulatedContent = "";
    for await (const chunk of result) {
      if (chunk.text) {
        fullText += chunk.text;
        
        // Handle potential thought blocks during streaming
        let processable = fullText;
        if (processable.includes('</thought>')) {
          processable = processable.split('</thought>').pop()?.trim() || processable;
        }

        let match = processable.match(/"?(?:content|research|text|essay|prose)"?\s*:\s*"(.*)/is);
        if (match && match[1]) {
          let unparsed = match[1];
          let endIdx = -1;
          for (let i = 0; i < unparsed.length; i++) {
              if (unparsed[i] === '"' && (i === 0 || unparsed[i-1] !== '\\')) {
                  endIdx = i;
                  break;
              }
          }
          if (endIdx !== -1) {
             unparsed = unparsed.substring(0, endIdx);
          }
          const cleaned = cleanStreamedString(unparsed);
          accumulatedContent = cleaned;
          
          // Also try to extract objectives if they are separate
          const mainObjMatch = processable.match(/"?mainObjective"?\s*:\s*"((?:[^"\\]|\\.)*)/i);
          const specObjMatch = processable.match(/"?specificObjectives"?\s*[:=]\s*\[([\s\S]*?)\]/i);
          
          onChunk({
            content: cleaned,
            mainObjective: mainObjMatch ? cleanStreamedString(mainObjMatch[1]) : undefined,
            specificObjectives: specObjMatch ? safeJsonParse('[' + specObjMatch[1] + ']') : undefined
          });
        } else if (processable.length > 50 && !processable.trim().startsWith('{')) {
          onChunk(processable);
        }
      }
    }
    
    try {
      const data = safeJsonParse(fullText);
      if (data && typeof data === 'object') {
        if (!data.content) {
          data.content = data.text || data.essay || data.research || accumulatedContent || fullText;
        }
        return data;
      } else {
        return {
          content: accumulatedContent || fullText,
          citations: []
        };
      }
    } catch (e) {
      console.error("Failed to parse streamed research AI response:", fullText, e);
      return {
        content: accumulatedContent || fullText,
        citations: []
      };
    }
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: "Generate the research section now." }] }],
    config
  });

  const text = response.text || "{}";
  try {
    const data = safeJsonParse(text);
    if (data && typeof data === 'object') {
      if (!data.content) {
        data.content = data.text || data.essay || data.research || text;
      }
      return data;
    } else {
      return {
        content: text,
        citations: []
      };
    }
  } catch (e) {
    console.error("Failed to parse research AI response:", text, e);
    return {
      content: text,
      citations: []
    };
  }
}

export async function generateBiographyChapter(options: any, onChunk?: (chunk: any) => void) {
  const { title, content, language = "English" } = options;
  const ai = getAi();

  const systemInstruction = `You are a ghostwriter specialized in biographies. Your task is to turn short notes into beautiful, flowing prose.
  The output MUST be written in ${language}.`;

  const prompt = `Expand on this biographical chapter. 
  Title: ${title}
  Initial notes/content: ${content}
  
  Maintain a consistent, engaging biographical tone. Write about 2-3 detailed paragraphs.`;

  if (onChunk) {
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        systemInstruction,
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      if (chunk.text) {
        fullText += chunk.text;
        let processable = fullText;
        if (processable.includes('</thought>')) {
          processable = processable.split('</thought>').pop()?.trim() || processable;
        }
        onChunk(processable);
      }
    }
    return fullText;
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { 
      systemInstruction,
    }
  });

  return response.text || content;
}

export async function generateBiographyTribute(options: any, onChunk?: (chunk: any) => void) {
  const { title, content, language = "English" } = options;
  const ai = getAi();

  const systemInstruction = `You are a professional tribute writer. Your goal is to transform fragments of memories into soulful, honoring messages.
  The output MUST be written in ${language}.`;

  const prompt = `Expand on this tribute message. 
  Heading: ${title}
  Initial notes: ${content}
  
  The tone should be heartfelt, emotional, and celebratory. Keep it concise but meaningful (1-2 paragraphs).`;

  if (onChunk) {
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        systemInstruction,
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      if (chunk.text) {
        fullText += chunk.text;
        let processable = fullText;
        if (processable.includes('</thought>')) {
          processable = processable.split('</thought>').pop()?.trim() || processable;
        }
        onChunk(processable);
      }
    }
    return fullText;
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { 
      systemInstruction,
    }
  });

  return response.text || content;
}

export async function generateAdCampaign(options: any) {
  const { title, audience, language = "English" } = options;
  const ai = getAi();

  const systemInstruction = `You are a high-conversion digital marketer specialized in book and story promotions. 
  Your goal is to write a compelling, reach-optimized ad copy for a work titled "${title}".
  Target Audience: ${audience}.
  The entire ad copy MUST be written in ${language}.
  
  Use emojis where appropriate, include hooks, and end with a strong call to action. 
  Keep it professional yet engaging for the Legacy platform feed.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: "Generate the ad copy now." }] }],
    config: { 
      systemInstruction,
    }
  });

  return response.text || "";
}

export async function generateResearchDataset(options: any) {
  const { title, objectives, variables, sampleSize = 50, language = "English" } = options;
  const ai = getAi();

  const systemInstruction = `You are a data scientist. Generate a synthetic research dataset (mock data) for a study titled "${title}".
  Objectives: ${(objectives || []).join('; ')}
  Variables to include: ${(variables || []).join(', ')}
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
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: "Generate the synthetic dataset now." }] }],
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

  const text = response.text || "{}";
  try {
    return safeJsonParse(text);
  } catch (e) {
    console.error("Failed to parse dataset AI response:", text, e);
    throw new Error("Invalid dataset AI response format");
  }
}

export async function generateExpertReview(options: any, onChunk?: (chunk: any) => void) {
  const { content, language = "English" } = options;
  const ai = getAi();

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
    "overallScore": 85,
    "summary": "High-level overview of the work's quality",
    "analysis": {
      "structure": "detailed analysis of structure",
      "characters": "detailed analysis of characters",
      "style": "detailed analysis of style"
    },
    "recommendations": ["step 1", "step 2", "step 3"]
  }`;

  const config = {
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
  };

  if (onChunk) {
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: `Analyze this text excerpt: ${content}` }] }],
      config
    });

    let fullText = "";
    for await (const chunk of result) {
      if (chunk.text) {
        fullText += chunk.text;
        
        let processable = fullText;
        if (processable.includes('</thought>')) {
          processable = processable.split('</thought>').pop()?.trim() || processable;
        }
        
        // Expert review streaming is tricky because it's JSON, 
        // but we can at least send the latest fullText so far
        onChunk(processable);
      }
    }
    
    try {
      return safeJsonParse(fullText);
    } catch (e) {
      console.error("Failed to parse streamed expert review AI response:", fullText, e);
      throw new Error("Invalid expert review AI response format");
    }
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `Analyze this text excerpt: ${content}` }] }],
    config
  });

  const text = response.text || "{}";
  try {
    return safeJsonParse(text);
  } catch (e) {
    console.error("Failed to parse review AI response:", text, e);
    throw new Error("Invalid review AI response format");
  }
}
