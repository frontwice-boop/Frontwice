import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const prompt = `Translate the following social media post objects into ${targetLanguage}. 
    Keep the hashtags, usernames, and music titles intact if they are unique identifiers, but translate the descriptions (desc) and tags (if they are words like #poetry).
    
    Return the translated posts as a JSON array matching the input structure.
    
    Posts: ${JSON.stringify(posts)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              user: { type: Type.STRING },
              desc: { type: Type.STRING },
              tags: { type: Type.STRING },
              music: { type: Type.STRING },
              likes: { type: Type.STRING },
              comments: { type: Type.STRING },
              color: { type: Type.STRING },
            },
            required: ['id', 'user', 'desc', 'tags', 'music', 'likes', 'comments', 'color']
          }
        }
      }
    });

    const translatedPosts = JSON.parse(response.text);
    setCache(cacheKey, translatedPosts);
    return translatedPosts;
  } catch (error) {
    console.error('Translation failed:', error);
    return posts; // Fallback to original posts
  }
}

export async function translateMoments(moments: any[], targetLanguage: string) {
  if (targetLanguage === 'English') return moments;

  const cacheKey = `moments_${targetLanguage}_${moments.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following gallery moment objects into ${targetLanguage}. 
    Translate the title and location. Keep the year, user, type, and image URL exactly as they are.
    
    Return the translated moments as a JSON array matching the input structure.
    
    Moments: ${JSON.stringify(moments)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              year: { type: Type.STRING },
              location: { type: Type.STRING },
              user: { type: Type.STRING },
              type: { type: Type.STRING },
              image: { type: Type.STRING },
            },
            required: ['title', 'year', 'location', 'user', 'type', 'image']
          }
        }
      }
    });

    const translatedMoments = JSON.parse(response.text);
    setCache(cacheKey, translatedMoments);
    return translatedMoments;
  } catch (error) {
    console.error('Translation failed:', error);
    return moments;
  }
}

export async function translateLibrary(entries: any[], targetLanguage: string) {
  if (targetLanguage === 'English') return entries;

  const cacheKey = `library_${targetLanguage}_${entries.length}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Translate the following research library entries into ${targetLanguage}. 
    Translate the title, dept (Department), and uni (University/Institution). Keep the auth (Author) and year exactly as they are.
    
    Return the translated entries as a JSON array matching the input structure.
    
    Entries: ${JSON.stringify(entries)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              auth: { type: Type.STRING },
              year: { type: Type.STRING },
              dept: { type: Type.STRING },
              uni: { type: Type.STRING },
            },
            required: ['title', 'auth', 'year', 'dept', 'uni']
          }
        }
      }
    });

    const translatedEntries = JSON.parse(response.text);
    setCache(cacheKey, translatedEntries);
    return translatedEntries;
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
    const prompt = `Translate the following chat objects into ${targetLanguage}. 
    Translate the name (if it's a descriptive name like "Elite Poets Society" or "AI Assistant") and lastMsg (the message content).
    Keep id and unread exactly as they are.
    Keep time as it is.
    
    Return the translated chats as a JSON array matching the input structure.
    
    Chats: ${JSON.stringify(chats)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              lastMsg: { type: Type.STRING },
              time: { type: Type.STRING },
              unread: { type: Type.NUMBER }
            },
            required: ['id', 'name', 'lastMsg', 'time', 'unread']
          }
        }
      }
    });

    const translatedChats = JSON.parse(response.text);
    setCache(cacheKey, translatedChats);
    return translatedChats;
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            followingLabel: { type: Type.STRING },
            followersLabel: { type: Type.STRING },
            worksLabel: { type: Type.STRING },
            securityLabel: { type: Type.STRING },
            langSettingLabel: { type: Type.STRING },
            logoutLabel: { type: Type.STRING },
            privacyLabel: { type: Type.STRING }
          },
          required: ['followingLabel', 'followersLabel', 'worksLabel', 'securityLabel', 'langSettingLabel', 'logoutLabel', 'privacyLabel']
        }
      }
    });

    const translated = JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titleLabel: { type: Type.STRING },
            genreLabel: { type: Type.STRING },
            devicesLabel: { type: Type.STRING },
            promptLabel: { type: Type.STRING },
            generateBtn: { type: Type.STRING },
            languageLabel: { type: Type.STRING },
            placeholderTitle: { type: Type.STRING },
            placeholderPrompt: { type: Type.STRING },
            dossiersLabel: { type: Type.STRING },
            publishBtn: { type: Type.STRING }
          },
          required: [
            'titleLabel', 'genreLabel', 'devicesLabel', 'promptLabel', 
            'generateBtn', 'languageLabel', 'placeholderTitle', 
            'placeholderPrompt', 'dossiersLabel', 'publishBtn'
          ]
        }
      }
    });

    const translated = JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            home: { type: Type.STRING },
            moments: { type: Type.STRING },
            library: { type: Type.STRING },
            chat: { type: Type.STRING },
            profile: { type: Type.STRING }
          },
          required: ['home', 'moments', 'library', 'chat', 'profile']
        }
      }
    });

    const translated = JSON.parse(response.text);
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
    Return as a JSON object with the exact same keys.
    
    Data: ${JSON.stringify(labels)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const translated = JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ['title', 'content']
              }
            },
            tributes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  contributors: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        image: { type: Type.STRING, nullable: true }
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
      }
    });

    const translated = JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const translated = JSON.parse(response.text);
    setCache(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return results;
  }
}
