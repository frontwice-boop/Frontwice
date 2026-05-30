export enum ThinkingLevel {
  HIGH = 'HIGH',
  LOW = 'LOW', 
  MINIMAL = 'MINIMAL'
}

export function initAi(key: string) {
  // Key is now strictly server-side
}

function processStreamData(data: string) {
  if (data.startsWith('data: ')) {
    let jsonStr = data.substring(6).trim();
    if (jsonStr) {
      try {
        const obj = JSON.parse(jsonStr);
        if (obj && typeof obj === 'object') {
          if (obj.text === undefined) {
            const parts = obj.candidates?.[0]?.content?.parts;
            if (Array.isArray(parts)) {
              obj.text = parts.map((p: any) => p.text || '').join('');
            } else {
              obj.text = '';
            }
          }
        }
        return obj;
      } catch (err) {}
    }
  }
  return null;
}

export function getAi() {
  return {
    models: {
      generateContent: async (params: any) => {
        const res = await fetch('/api/gemini/generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || 'Failed to generate content');
        }
        const obj = await res.json();
        if (obj && typeof obj === 'object') {
          if (obj.text === undefined) {
            const parts = obj.candidates?.[0]?.content?.parts;
            if (Array.isArray(parts)) {
              obj.text = parts.map((p: any) => p.text || '').join('');
            } else {
              obj.text = '';
            }
          }
        }
        return obj;
      },
      generateContentStream: async (params: any) => {
        const res = await fetch('/api/gemini/generateContentStream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
           throw new Error('Failed to start stream');
        }
        if (!res.body) throw new Error('No body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        async function* streamGenerator() {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const chunk = processStreamData(line);
              if (chunk) {
                yield chunk;
              } else if (line.startsWith('event: error')) {
                const nextLine = lines[i+1] || '';
                let errMsg = 'API Error';
                if (nextLine.startsWith('data: ')) {
                   try {
                     errMsg = JSON.parse(nextLine.substring(6)).error || errMsg;
                   } catch(e) {}
                }
                throw new Error(errMsg);
              }
            }
          }
          if (buffer) {
             const chunk = processStreamData(buffer);
             if (chunk) yield chunk;
          }
        }
        return streamGenerator();
      }
    }
  } as any;
}

export const MODEL_NAME = "gemini-2.5-flash"; // Latest stable model alias

export const TOOLS = [
  { googleSearch: {} }
];
