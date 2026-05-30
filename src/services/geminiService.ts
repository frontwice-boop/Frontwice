import { getAi, MODEL_NAME, ThinkingLevel } from "../lib/gemini";
import { safeJsonParse } from "../lib/jsonParser";

export async function generateResearchInsight(title: string, abstract: string, onChunk?: (chunk: string) => void) {
  const ai = getAi();

  try {
    if (onChunk) {
      const response = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: `You are an expert research librarian. Provide a concise, high-level summary and 3 key potential impacts for the following research manuscript:
        
        TITLE: ${title}
        ABSTRACT/PREVIEW: ${abstract}
        
        Format the response in Markdown.`,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });

      let fullText = "";
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          onChunk(chunk.text);
        }
      }
      return fullText;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are an expert research librarian. Provide a concise, high-level summary and 3 key potential impacts for the following research manuscript:
      
      TITLE: ${title}
      ABSTRACT/PREVIEW: ${abstract}
      
      Format the response in Markdown.`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function generateCreativeFeedback(genre: string, content: string, onChunk?: (chunk: string) => void) {
  const ai = getAi();

  try {
    if (onChunk) {
      const response = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: `You are a professional ${genre} editor. Review the following work and provide 3 constructive suggestions for improvement and one encouraging highlight:

        CONTENT: ${content}

        Format the response in Markdown.`,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });

      let fullText = "";
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          onChunk(chunk.text);
        }
      }
      return fullText;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are a professional ${genre} editor. Review the following work and provide 3 constructive suggestions for improvement and one encouraging highlight:

      CONTENT: ${content}

      Format the response in Markdown.`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function generateBiographyDraft(name: string, facts: string, language: string = 'English') {
  const ai = getAi();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are a professional biographer. Based on the following facts about ${name}, generate a structured biography outline with 3 distinct chapters. 
      For each chapter, provide a title and 2 paragraphs of evocative, biographical prose.
      
      FACTS: ${facts}
      LANGUAGE: ${language}
      
      IMPORTANT: Respond ONLY with a valid JSON object.
      
      Format:
      {
        "biographyTitle": "Suggest a poetic title",
        "chapters": [
          { "title": "Chapter Title", "content": "Narrative content..." },
          { "title": "Chapter Title", "content": "Narrative content..." },
          { "title": "Chapter Title", "content": "Narrative content..." }
        ]
      }`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    const text = response.text || "{}";
    try {
      return safeJsonParse(text);
    } catch (e) {
      console.error("Failed to parse biography draft AI response:", text, e);
      throw new Error("Invalid biography draft response format");
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function generateAdKeywords(title: string, audience: string) {
  const ai = getAi();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate 10 high-performing search keywords and 5 trending hashtags for a promotional campaign for a work titled "${title}".
      Target Audience: ${audience}
      
      Format as a JSON object:
      {
        "keywords": ["keyword1", "keyword2", "..."],
        "hashtags": ["#tag1", "#tag2", "..."]
      }`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    const text = response.text || "{}";
    try {
      return safeJsonParse(text);
    } catch (e) {
      console.error("Failed to parse ad keywords AI response:", text, e);
      throw new Error("Invalid ad keywords response format");
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function analyzeMomentSentiment(caption: string) {
  const ai = getAi();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the sentiment and 'legacy vibe' of this caption: "${caption}".
      Directly return a single word that describes the mood (e.g., Nostalgic, Heroic, Melancholy, Joyful) and a 1-sentence poetic explanation.
      
      Format as JSON:
      {
        "mood": "Word",
        "explanation": "Poetic sentence."
      }`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    const text = response.text || "{}";
    try {
      return safeJsonParse(text);
    } catch (e) {
      console.error("Failed to parse moment sentiment AI response:", text, e);
      throw new Error("Invalid moment sentiment response format");
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function generateMomentCaption(location: string, year: string) {
  const ai = getAi();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate a poetic, nostalgic, and very short (max 10 words) caption for a visual memory from:
      
      LOCATION: ${location}
      YEAR: ${year}
      
      Make it sound like a cherished legacy.`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    return response.text.replace(/["']/g, "").trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function extractResearchMetadata(hint: string) {
  const ai = getAi();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are an expert research librarian. Extract metadata for a research paper based on the following hint (could be a filename, a title, or a brief description).
      
      HINT: ${hint}
      
      Respond ONLY with a valid JSON object. Guess missing fields intelligently if the hint provides some context (e.g., if it's "Quantum Computing Thesis MIT 2023", then Title is likely related to Quantum Computing, Institution is MIT, Year is 2023).
      
      Format:
      {
        "title": "Full Research Title",
        "authors": "Author Name(s) (Comma separated)",
        "year": "YYYY",
        "uni": "Institution Name",
        "dept": "Department Name"
      }`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });

    const text = response.text || "{}";
    try {
      return safeJsonParse(text);
    } catch (e) {
      console.error("Failed to parse research metadata AI response:", text, e);
      throw new Error("Invalid research metadata response format");
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
