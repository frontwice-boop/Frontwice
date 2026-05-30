// import { GoogleGenAI, Type } from "@google/genai";
// removed for security, using server-side transitions

import { getAi, MODEL_NAME, ThinkingLevel } from "../lib/gemini";
import { safeJsonParse } from "../lib/jsonParser";

const callAi = async (options: any) => {
  const { prompt, systemInstruction, schema } = options;
  const ai = getAi();
  
  const config: any = {
    responseMimeType: "application/json",
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
  };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (schema) {
    config.responseSchema = schema;
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config
  });

  const text = response.text || "{}";
  try {
    return safeJsonParse(text);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", text, e);
    throw new Error("Invalid AI response format");
  }
};

const getCache = (key: string) => {
  try {
    const cached = localStorage.getItem(`trans_cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(`trans_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('Cache set failed', e);
  }
};

export const hasCache = (key: string) => {
  try {
    return localStorage.getItem(`trans_cache_${key}`) !== null;
  } catch {
    return false;
  }
};

export async function translateFeed(posts: any[], targetLanguage: string) {
  if (targetLanguage === 'English') return posts;

  const cacheKey = `feed_${targetLanguage}_${posts.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // Only send relevant text fields to minimize payload and guarantee schema structural safety
    const itemsToTranslate = posts.map(p => ({
      id: p.id,
      authorName: p.authorName || p.user || '',
      desc: p.desc || '',
      fullWork: p.fullWork || '',
      tags: p.tags || '',
      music: p.music || ''
    }));

    const prompt = `Translate the following text fields into ${targetLanguage}. 
    Translate "desc", "fullWork" (retaining Markdown formatting headers/bold/lists perfectly), list tags in "tags", and music name if appropriate. 
    Keep "id" and "authorName" exactly the same or lightly adjust the name if needed for layout.
    
    Return as a JSON array matching this structure.
    
    Data: ${JSON.stringify(itemsToTranslate)}`;

    const translatedItems = await callAi({
      prompt: prompt,
      schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            authorName: { type: "string" },
            desc: { type: "string" },
            fullWork: { type: "string" },
            tags: { type: "string" },
            music: { type: "string" }
          },
          required: ['id', 'authorName', 'desc', 'fullWork', 'tags', 'music']
        }
      }
    });

    // Hash the results on ID for O(1) matching speed
    const translatedMap = new Map<string, any>();
    if (Array.isArray(translatedItems)) {
      translatedItems.forEach(item => {
        if (item && item.id) {
          translatedMap.set(item.id, item);
        }
      });
    }

    // Merge translated text fields back onto the original posts to completely protect structural fields
    const mergedPosts = posts.map(p => {
      const trans = translatedMap.get(p.id);
      if (trans) {
        return {
          ...p,
          user: trans.authorName || p.authorName || p.user || '', // Backward compatibility with post.user references
          authorName: trans.authorName || p.authorName || '',
          desc: trans.desc || p.desc || '',
          fullWork: trans.fullWork || p.fullWork || '',
          tags: trans.tags || p.tags || '',
          music: trans.music || p.music || ''
        };
      }
      return {
        ...p,
        user: p.authorName || p.user || ''
      };
    });

    setCache(cacheKey, mergedPosts);
    return mergedPosts;
  } catch (error) {
    console.error('Translation failed, keeping original posts with user fallback:', error);
    return posts.map(p => ({
      ...p,
      user: p.authorName || p.user || ''
    }));
  }
}

export async function translateMoments(moments: any[], targetLanguage: string) {
  if (targetLanguage === 'English') return moments;

  const cacheKey = `moments_${targetLanguage}_${moments.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const itemsToTranslate = moments.map(m => ({
      id: m.id,
      title: m.title || m.desc || '',
      location: m.location || '',
      user: m.authorName || m.user || ''
    }));

    const prompt = `Translate the following gallery moment objects into ${targetLanguage}. 
    Translate the "title" and "location". Keep "id" and "user" exactly as they are.
    
    Return as a JSON array matching the structure.
    
    Moments: ${JSON.stringify(itemsToTranslate)}`;

    const translatedItems = await callAi({
      prompt: prompt,
      schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            location: { type: "string" },
            user: { type: "string" }
          },
          required: ['id', 'title', 'location', 'user']
        }
      }
    });

    const translatedMap = new Map<string, any>();
    if (Array.isArray(translatedItems)) {
      translatedItems.forEach(item => {
        if (item && item.id) {
          translatedMap.set(item.id, item);
        }
      });
    }

    const mergedMoments = moments.map(m => {
      const trans = translatedMap.get(m.id);
      if (trans) {
        return {
          ...m,
          title: trans.title || m.title || m.desc || '',
          desc: trans.title || m.desc || '',
          location: trans.location || m.location || '',
          user: trans.user || m.authorName || m.user || '',
          authorName: trans.user || m.authorName || ''
        };
      }
      return {
        ...m,
        title: m.title || m.desc || '',
        user: m.authorName || m.user || ''
      };
    });

    setCache(cacheKey, mergedMoments);
    return mergedMoments;
  } catch (error) {
    console.error('Translation failed:', error);
    return moments.map(m => ({
      ...m,
      title: m.title || m.desc || '',
      user: m.authorName || m.user || ''
    }));
  }
}

export async function translateLibrary(entries: any[], targetLanguage: string) {
  if (targetLanguage === 'English') return entries;

  const cacheKey = `library_${targetLanguage}_${entries.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const itemsToTranslate = entries.map(e => ({
      id: e.id,
      title: e.title || '',
      dept: e.dept || '',
      uni: e.uni || ''
    }));

    const prompt = `Translate the following research library entries into ${targetLanguage}. 
    Translate the "title", "dept" (Department), and "uni" (University/Institution). Keep "id" exactly the same.
    
    Return as a JSON array matching the structure.
    
    Entries: ${JSON.stringify(itemsToTranslate)}`;

    const translatedItems = await callAi({
      prompt: prompt,
      schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            dept: { type: "string" },
            uni: { type: "string" },
          },
          required: ['id', 'title', 'dept', 'uni']
        }
      }
    });

    const translatedMap = new Map<string, any>();
    if (Array.isArray(translatedItems)) {
      translatedItems.forEach(item => {
        if (item && item.id) {
          translatedMap.set(item.id, item);
        }
      });
    }

    const mergedEntries = entries.map(e => {
      const trans = translatedMap.get(e.id);
      if (trans) {
        return {
          ...e,
          title: trans.title || e.title || '',
          dept: trans.dept || e.dept || '',
          uni: trans.uni || e.uni || ''
        };
      }
      return e;
    });

    setCache(cacheKey, mergedEntries);
    return mergedEntries;
  } catch (error) {
    console.error('Translation failed:', error);
    return entries;
  }
}

export async function translateChats(chats: any[], targetLanguage: string) {
  if (targetLanguage === 'English') return chats;

  const cacheKey = `chats_${targetLanguage}_${chats.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const itemsToTranslate = chats.map(c => ({
      id: c.id,
      name: c.name || '',
      lastMsg: c.lastMsg || ''
    }));

    const prompt = `Translate the following chat objects into ${targetLanguage}. 
    Translate the "name" (if it's a descriptive name like "Elite Poets Society" or "AI Assistant") and "lastMsg" (the last message text content). 
    Keep "id" exactly as it is.
    
    Return as a JSON array matching the structure.
    
    Chats: ${JSON.stringify(itemsToTranslate)}`;

    const translatedItems = await callAi({
      prompt: prompt,
      schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            lastMsg: { type: "string" }
          },
          required: ['id', 'name', 'lastMsg']
        }
      }
    });

    const translatedMap = new Map<string, any>();
    if (Array.isArray(translatedItems)) {
      translatedItems.forEach(item => {
        if (item && item.id) {
          translatedMap.set(item.id, item);
        }
      });
    }

    const mergedChats = chats.map(c => {
      const trans = translatedMap.get(c.id);
      if (trans) {
        return {
          ...c,
          name: trans.name || c.name || '',
          lastMsg: trans.lastMsg || c.lastMsg || ''
        };
      }
      return c;
    });

    setCache(cacheKey, mergedChats);
    return mergedChats;
  } catch (error) {
    console.error('Translation failed:', error);
    return chats;
  }
}

export async function translateProfile(labels: any, targetLanguage: string) {
  if (targetLanguage === 'English') return labels;

  const cacheKey = `profile_${targetLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following profile information into ${targetLanguage}. 
    Translate labels like "Following", "Followers", "Works", "Account Security", "Language Setting", "Password & Privacy".
    Return as a JSON object with translated values.
    
    Data: ${JSON.stringify(labels)}`;

    const translated = await callAi({
      prompt: prompt,
      schema: {
        type: "object",
        properties: {
          followingLabel: { type: "string" },
          followersLabel: { type: "string" },
          worksLabel: { type: "string" },
          securityLabel: { type: "string" },
          langSettingLabel: { type: "string" },
          logoutLabel: { type: "string" },
          privacyLabel: { type: "string" }
        },
        required: ['followingLabel', 'followersLabel', 'worksLabel', 'securityLabel', 'langSettingLabel', 'logoutLabel', 'privacyLabel']
      }
    });
    setCache(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return null;
  }
}

export async function translateCreativeSuite(labels: any, targetLanguage: string) {
  if (targetLanguage === 'English') return labels;

  const cacheKey = `creative_${targetLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following Creative Suite UI labels into ${targetLanguage}. 
    Translate keys like:
    - titleLabel (Title)
    - genreLabel (Genre)
    - devicesLabel (Literary Devices)
    - promptLabel (AI Prompt / Setting)
    - generateBtn (Generate Work)
    - languageLabel (Work Language)
    - placeholderTitle (Enter a captivating title...)
    - placeholderPrompt (Give the AI more context or specific instructions...)
    - dossiersLabel (Extracted Character Dossiers)
    - publishBtn (Publish to Feed)
    
    Return as a JSON object with translated values.
    
    Data: ${JSON.stringify(labels)}`;

    const translated = await callAi({
      prompt: prompt,
      schema: {
        type: "object",
        properties: {
          titleLabel: { type: "string" },
          genreLabel: { type: "string" },
          devicesLabel: { type: "string" },
          promptLabel: { type: "string" },
          generateBtn: { type: "string" },
          languageLabel: { type: "string" },
          placeholderTitle: { type: "string" },
          placeholderPrompt: { type: "string" },
          dossiersLabel: { type: "string" },
          publishBtn: { type: "string" }
        },
        required: [
          'titleLabel', 'genreLabel', 'devicesLabel', 'promptLabel', 
          'generateBtn', 'languageLabel', 'placeholderTitle', 
          'placeholderPrompt', 'dossiersLabel', 'publishBtn'
        ]
      }
    });
    setCache(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return null;
  }
}

export async function translateNavigation(targetLanguage: string) {
  if (targetLanguage === 'English') return ['Home', 'Moments', 'Library', 'Chat', 'Profile'];

  const cacheKey = `nav_${targetLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following primary navigation feature names into ${targetLanguage}: 
    "Home", "Moments", "Library", "Chat", "Profile".
    
    Return as a JSON object with keys: home, moments, library, chat, profile.`;

    const translated = await callAi({
      prompt: prompt,
      schema: {
        type: "object",
        properties: {
          home: { type: "string" },
          moments: { type: "string" },
          library: { type: "string" },
          chat: { type: "string" },
          profile: { type: "string" }
        },
        required: ['home', 'moments', 'library', 'chat', 'profile']
      }
    });
    const result = [translated.home, translated.moments, translated.library, translated.chat, translated.profile];
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Translation failed:', error);
    return ['Home', 'Moments', 'Library', 'Chat', 'Profile'];
  }
}

export async function translateUI(labels: any, targetLanguage: string) {
  if (targetLanguage === 'English') return labels;

  const cacheKey = `ui_${targetLanguage}_${Object.keys(labels).length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following UI labels into ${targetLanguage}. 
    Return as a JSON object with the exact same keys and translated values.
    
    Data: ${JSON.stringify(labels)}`;

    const translated = await callAi({
      prompt: prompt,
      systemInstruction: "You are a professional translator. Always return valid JSON matching the requested structure."
    });
    setCache(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return labels;
  }
}

export async function translateBiography(data: { chapters: any[], tributes: any[] }, targetLanguage: string) {
  if (targetLanguage === 'English') return data;

  const cacheKey = `bio_${targetLanguage}_${data.chapters.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following biography data into ${targetLanguage}. 
    Translate chapter titles and content.
    Translate tribute titles and content.
    Translate contributor names.
    
    Return as a JSON object with keys: chapters, tributes.
    
    Data: ${JSON.stringify(data)}`;

    const translated = await callAi({
      prompt: prompt,
      schema: {
        type: "object",
        properties: {
          chapters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" }
              },
              required: ['title', 'content']
            }
          },
          tributes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                contributors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      image: { type: "string", nullable: true }
                    },
                    required: ['name', 'image']
                  }
                }
              },
              required: ['title', 'content', 'contributors']
            }
          }
        },
        required: ['chapters', 'tributes']
      }
    });
    setCache(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return data;
  }
}

export async function translateResearch(results: Record<string, { content: string; citations: string[] }>, targetLanguage: string) {
  if (targetLanguage === 'English') return results;

  const cacheKey = `research_${targetLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following research results into ${targetLanguage}. 
    Translate the content and the citations. 
    Keep the keys (chapter-section) exactly as they are.
    
    Return as a JSON object matching the input structure.
    
    Data: ${JSON.stringify(results)}`;

    const translated = await callAi({
      prompt: prompt
    });
    setCache(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return results;
  }
}
