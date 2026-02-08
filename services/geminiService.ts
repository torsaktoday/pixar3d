import { GoogleGenAI } from "@google/genai";
import { AnalysisMode, ProductionGuide } from "../types";

/**
 * Converts a File object to a Base64 string suitable for Gemini API.
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Fetches a video from a URL and converts it to Base64.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video (Status: ${response.status}). Ensure the URL is directly accessible and supports CORS.`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("URL Fetch Error:", error);
    throw new Error("Could not load video from URL. This is likely due to CORS restrictions on the remote server. Please try uploading the file directly.");
  }
};

const TIKTOK_RULES = `
TIKTOK POLICY & FORBIDDEN WORDS (STRICT ENFORCEMENT):
1. Overclaims: "รักษาได้ทุกโรค" (Cure all), "หายขาด" (Cured), "เห็นผล 100%" (100% results), "ขาวใน 3 วัน" (White in 3 days), "ลดน้ำหนัก 10โล ใน 1 สัปดาห์".
2. Forbidden Words (Medical/Supplement): "รักษา" (Cure), "บรรเทา" (Relieve), "แก้" (Fix health), "ป้องกัน" (Prevent), "ยับยั้ง" (Inhibit), "ฟื้นฟู" (Restore), "ต้าน" (Resist), "บำบัด" (Therapy).
3. Forbidden Pairings:
   - "กระตุ้น" + "ระบบขับถ่าย"
   - "ขจัด" + "สิ่งอุดตัน/สารพิษ"
   - "ลด" + "ความอ้วน/ไขมัน/สิว/ฝ้า/กระ"
   - "เร่ง" + "เผาผลาญ"
   - "ขาว" + "ผิว/หน้า"
4. Violence/Safety: No weapons, blood, killing, abuse, bullying, dangerous acts.
5. Platform Mentions: Do not say Facebook, YouTube, Line. Use "App Fah", "App Daeng", "App Kheaw".
6. Before/After images are restricted.
`;

const getPromptForMode = (mode: AnalysisMode, language: 'en' | 'th'): string => {
  const langInstruction = language === 'th' 
    ? "Please answer in Thai language." 
    : "Please answer in English.";

  switch (mode) {
    case AnalysisMode.SUMMARY:
      return `Analyze this video and provide a comprehensive summary of the content. Describe the visual setting, the main topic, and the flow of events. ${langInstruction}`;
    case AnalysisMode.TRANSCRIPT:
      return `Transcribe the audio in this video word-for-word. If there are multiple speakers, identify them as Speaker 1, Speaker 2, etc. Include timestamps (e.g. [00:12]) at the beginning of each sentence or speaker change. ${langInstruction}`;
    case AnalysisMode.KEY_POINTS:
      return `Extract the key takeaways and bullet points from this video. Focus on the most important information presented. ${langInstruction}`;
    case AnalysisMode.SAFETY:
      // Special prompt for Safety to return JSON
      return `
      You are a strict TikTok Policy Moderator. Analyze the video (visuals and audio) against these rules:
      ${TIKTOK_RULES}

      Output strictly in valid JSON format with this structure:
      {
        "riskScore": number (0-100, where 0 is Safe, 100 is Severe Violation),
        "violations": ["string", "string"], (List specific words/phrases/visuals found that violate rules),
        "explanation": "string", (Brief explanation of the verdict in Thai),
        "transcript_summary": "string" (Provide the full transcript/script of the video with Timestamps [MM:SS] and Speaker labels. This is crucial for editing.)
      }
      Do not include Markdown formatting (like \`\`\`json). Just the raw JSON string.
      `;
    default:
      return `Tell me what is happening in this video. ${langInstruction}`;
  }
};

/**
 * Main function to analyze the video.
 */
export const analyzeVideo = async (
  apiKey: string,
  base64Data: string, 
  mimeType: string, 
  mode: AnalysisMode,
  language: 'en' | 'th'
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your Gemini API Key in the settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = getPromptForMode(mode, language);
    const modelName = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        maxOutputTokens: 8192,
        temperature: 0.4,
        // For safety mode, we want structured output, but we handle parsing manually for robustness
        responseMimeType: mode === AnalysisMode.SAFETY ? "application/json" : "text/plain",
      }
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("No response text received from the model.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && error.message.includes('404')) {
       throw new Error("Model not found (404). Please ensure your API key is active.");
    }
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred.");
  }
};

/**
 * Rewrites a script to be TikTok compliant.
 */
export const rewriteScript = async (
  apiKey: string,
  originalContent: string,
  violations: string[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
  You are a professional TikTok Script Editor.
  I have a video transcript/script that contains policy violations.
  
  Original Script:
  "${originalContent}"
  
  Violations Detected: ${violations.join(", ")}
  
  TIKTOK RULES:
  ${TIKTOK_RULES}
  
  TASK:
  Rewrite the content to be 100% compliant with TikTok policies.
  
  CRITICAL INSTRUCTIONS:
  1. PRESERVE STRUCTURE: You must keep the original Timestamps (e.g., [00:12]) and Speaker Labels exactly as they are. Do not remove or reorder them.
  2. TARGETED FIXES: Only change the specific words or phrases that violate the policy (e.g., change "รักษา" to "ดูแล", "ขาว" to "กระจ่างใส").
  3. MAINTAIN MEANING: Keep the original tone and context as much as possible.
  4. LANGUAGE: Output the rewritten script in Thai.
  
  Example Input:
  [00:05] Speaker 1: ครีมนี้รักษาฝ้าให้หายขาดได้ทันที
  
  Example Output:
  [00:05] Speaker 1: ครีมนี้ช่วยดูแลปัญหาฝ้าให้แลดูจางลง
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] }
    });
    return response.text || "Could not generate rewritten script.";
  } catch (error) {
    console.error("Rewrite Error:", error);
    throw new Error("Failed to rewrite script.");
  }
};

/**
 * Generates a full production guide (Remix/Style/Scenes).
 */
export const generateProductionGuide = async (
  apiKey: string,
  baseScript: string,
  style: 'REAL' | 'PIXAR',
  remixTopic?: string
): Promise<ProductionGuide> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const stylePrompt = style === 'PIXAR' 
    ? `VISUAL STYLE: "Pixar-style 3D Animation".
       - Keywords to use in prompts: "Pixar-style, 3D render, cinematic lighting, soft glow, warm tone, vibrant colors, high detail, cute, expressive characters".
       - Aspect Ratio: 9:16 (Vertical).
       - Atmosphere: Friendly, cheerful, high quality animation.`
    : `VISUAL STYLE: "Realistic Live Action".
       - Keywords to use in prompts: "Photorealistic, 4k, cinematic lighting, real human actor, natural look, authentic, high resolution".
       - Aspect Ratio: 9:16 (Vertical).
       - Atmosphere: Professional, trustworthy, authentic.`;

  const remixInstruction = remixTopic 
    ? `TASK: "REMIX" the content. 
       - Analyze the STRUCTURE of the Base Script (e.g. Hook -> Pain Point -> Solution -> Call to Action).
       - Create a NEW script about the topic: "${remixTopic}".
       - Keep the EXACT SAME pacing, timestamp structure, and emotional beat as the base script.
       - Ensure the new script is 100% Safe/Compliant with TikTok rules (No overclaims).`
    : `TASK: Use the Base Script content directly. Break it down into scenes.`;

  const prompt = `
  You are an expert AI Video Producer.
  
  Base Script:
  "${baseScript}"
  
  ${remixInstruction}
  
  ${stylePrompt}
  
  OUTPUT FORMAT:
  Return a strictly valid JSON object (no markdown). Structure:
  {
    "topic": "${remixTopic || "Original Topic"}",
    "style": "${style}",
    "scenes": [
      {
        "timestamp": "[00:00]",
        "script": "The spoken line for this scene (Thai)",
        "visualPrompt": "Detailed English prompt for AI Image/Video generator (Midjourney/Sora/Runway) based on the chosen style.",
        "actionGuide": "Direction for the character (mood, gesture, facial expression) to match the audio."
      }
      ...
    ]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    
    if (!response.text) throw new Error("No response");
    return JSON.parse(response.text) as ProductionGuide;
  } catch (error) {
    console.error("Production Guide Error:", error);
    throw new Error("Failed to generate production guide.");
  }
};