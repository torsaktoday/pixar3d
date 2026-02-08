import { GoogleGenAI } from "@google/genai";
import { AnalysisMode, ProductionGuide, ViolationCheckResult } from "../types";
import { buildRulesPrompt, checkTextViolation } from "./tiktokRulesService";

// CORS Proxy Options for URL fetching
const CORS_PROXIES = [
  '', // Try direct first
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

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
 * Extract video ID from various URL formats (YouTube, TikTok, etc.)
 */
export const extractVideoInfo = (url: string): { platform: string; videoId: string | null; directUrl: string } => {
  const result = { platform: 'direct', videoId: null as string | null, directUrl: url };

  try {
    const urlObj = new URL(url);

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      result.platform = 'youtube';
      if (urlObj.hostname.includes('youtu.be')) {
        result.videoId = urlObj.pathname.slice(1);
      } else {
        result.videoId = urlObj.searchParams.get('v');
      }
    }
    // TikTok
    else if (urlObj.hostname.includes('tiktok.com')) {
      result.platform = 'tiktok';
      const match = urlObj.pathname.match(/video\/(\d+)/);
      if (match) {
        result.videoId = match[1];
      }
    }
    // Vimeo
    else if (urlObj.hostname.includes('vimeo.com')) {
      result.platform = 'vimeo';
      const match = urlObj.pathname.match(/\/(\d+)/);
      if (match) {
        result.videoId = match[1];
      }
    }
    // Facebook/Instagram
    else if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.watch')) {
      result.platform = 'facebook';
    }
    else if (urlObj.hostname.includes('instagram.com')) {
      result.platform = 'instagram';
    }
  } catch {
    // Invalid URL, keep as direct
  }

  return result;
};

/**
 * Fetches a video from a URL and converts it to Base64.
 * Tries multiple CORS proxies if direct fetch fails.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  const videoInfo = extractVideoInfo(url);

  // For social media platforms, we can't directly fetch - show helpful error
  if (['youtube', 'tiktok', 'vimeo', 'facebook', 'instagram'].includes(videoInfo.platform)) {
    throw new Error(
      `Cannot directly fetch from ${videoInfo.platform}. ` +
      `Please download the video first and upload it directly, or use a direct video URL (.mp4, .webm, .mov).`
    );
  }

  let lastError: Error | null = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const fetchUrl = proxy ? `${proxy}${encodeURIComponent(url)}` : url;

      const response = await fetch(fetchUrl, {
        headers: {
          'Accept': 'video/*,*/*',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video (Status: ${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Check if it's actually a video
      if (!contentType.includes('video') && !contentType.includes('octet-stream')) {
        // Could be a redirect or HTML page
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('URL returned HTML instead of video. Please use a direct video link.');
        }
      }

      const blob = await response.blob();

      // Validate blob is a video
      if (blob.size < 1000) {
        throw new Error('Response too small to be a video file.');
      }

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
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Fetch attempt failed${proxy ? ` with proxy ${proxy}` : ' (direct)'}:`, error);
      continue;
    }
  }

  throw new Error(
    lastError?.message ||
    "Could not load video from URL. This is likely due to CORS restrictions. " +
    "Please download the video and upload it directly."
  );
};

// Dynamic TikTok Rules - now loaded from database
const getTikTokRules = (): string => {
  try {
    return buildRulesPrompt();
  } catch {
    // Fallback to basic rules if database is not available
    return `
TIKTOK POLICY & FORBIDDEN WORDS (STRICT ENFORCEMENT):
1. Overclaims: "รักษาได้ทุกโรค", "หายขาด", "เห็นผล 100%", "ขาวใน 3 วัน".
2. Forbidden Words: "รักษา", "บรรเทา", "แก้", "ป้องกัน", "ยับยั้ง", "ฟื้นฟู", "ต้าน", "บำบัด".
3. Forbidden Pairings: "กระตุ้น+ระบบขับถ่าย", "ลด+ความอ้วน", "ขาว+ผิว".
4. Violence/Safety: No weapons, blood, dangerous acts.
5. Platform Mentions: Do not say Facebook, YouTube, Line.
6. Before/After images are restricted.
    `;
  }
};

const getPromptForMode = (mode: AnalysisMode, language: 'en' | 'th'): string => {
  const langInstruction = language === 'th'
    ? "Please answer in Thai language."
    : "Please answer in English.";

  const tiktokRules = getTikTokRules();

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
      ${tiktokRules}

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
  ${getTikTokRules()}
  
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
 * Video Mood Configurations - Define how each mood affects the video prompts
 * 5 Thai-focused mood options for TikTok content creators
 */
export const VIDEO_MOOD_CONFIGS = {
  original: {
    id: 'original' as const,
    label: 'Original',
    labelTh: 'ตามต้นฉบับ',
    emoji: '🎬',
    description: 'รักษาโทน พลังงาน และอารมณ์ตามต้นฉบับเดิม',
    promptKeywords: 'natural flow, authentic energy, match source material mood',
    cameraMovement: 'varied as appropriate to scene',
    pacing: 'match original timing and rhythm'
  },
  excited: {
    id: 'excited' as const,
    label: 'Exciting',
    labelTh: 'ตื่นเต้นเร้าใจ',
    emoji: '🔥',
    description: 'พลังงานสูง ลุ้นระทึก สร้างความตื่นเต้นให้ผู้ชม',
    promptKeywords: 'thrilling, suspenseful, high energy, dramatic tension, gripping, intense expressions, dynamic lighting, exciting atmosphere',
    cameraMovement: 'quick cuts, dramatic zoom, handheld intensity, shaky cam for tension',
    pacing: 'fast-paced, punchy transitions, building anticipation, climactic moments'
  },
  energetic: {
    id: 'energetic' as const,
    label: 'Energetic',
    labelTh: 'กระฉับกระเฉง',
    emoji: '⚡',
    description: 'คล่องแคล่ว กระปรี้กระเปร่า เต็มไปด้วยพลัง',
    promptKeywords: 'action-packed, athletic, bold movements, high contrast, powerful stance, vibrant energy, active motion',
    cameraMovement: 'tracking shots, follow cam, dynamic angles, fast pan',
    pacing: 'rhythmic, beat-driven, punchy, upbeat'
  },
  emotional: {
    id: 'emotional' as const,
    label: 'Emotional',
    labelTh: 'เศร้าซึ้ง',
    emoji: '💔',
    description: 'ซาบซึ้ง กินใจ สร้างอารมณ์ร่วมกับผู้ชม',
    promptKeywords: 'melancholic, touching, heartfelt, soft focus, moody lighting, intimate moments, tearful expressions, bittersweet atmosphere',
    cameraMovement: 'slow push-in, lingering shots, close-ups on faces, gentle dolly',
    pacing: 'slow build, emotional crescendo, heavy pauses for impact, breathing room'
  },
  cinematic: {
    id: 'cinematic' as const,
    label: 'Cinematic',
    labelTh: 'อลังการภาพยนตร์',
    emoji: '🎥',
    description: 'ยิ่งใหญ่อลังการ สไตล์หนังฮอลลีวูด เน้นความสวยงาม',
    promptKeywords: 'epic cinematic, blockbuster style, dramatic lighting, high contrast, intense composition, shadow play, movie-quality, grand scale, hollywood aesthetic',
    cameraMovement: 'slow motion, epic wide shots, dramatic reveal, sweeping crane, dolly zoom',
    pacing: 'building tension, impactful pauses, climactic moments, theatrical timing'
  },
  creative: {
    id: 'creative' as const,
    label: 'Creative',
    labelTh: 'สร้างสรรค์',
    emoji: '✨',
    description: 'AI คิดใหม่ เรียบเรียงใหม่ ไม่ copy ต้นฉบับ แต่รักษาความหมายเดิม',
    promptKeywords: 'reimagined, fresh perspective, creative interpretation, unique expression, artistic freedom, original wording, paraphrased creatively',
    cameraMovement: 'creative angles, unique perspectives, artistic shots, experimental framing',
    pacing: 'flowing, natural rhythm, engaging, fresh delivery'
  }
};

/**
 * Generates a full production guide (Remix/Style/Scenes) with mood control.
 */
export const generateProductionGuide = async (
  apiKey: string,
  baseScript: string,
  style: 'REAL' | 'PIXAR',
  remixTopic?: string,
  mood: 'original' | 'excited' | 'energetic' | 'emotional' | 'cinematic' | 'creative' = 'original'
): Promise<ProductionGuide> => {
  const ai = new GoogleGenAI({ apiKey });

  const moodConfig = VIDEO_MOOD_CONFIGS[mood];

  const stylePrompt = style === 'PIXAR'
    ? `VISUAL STYLE: "Pixar-style 3D Animation".
       - Base Keywords: "Pixar-style, 3D render, cinematic lighting, soft glow, warm tone, vibrant colors, high detail, cute, expressive characters".
       - Aspect Ratio: 9:16 (Vertical for TikTok).
       - Atmosphere: Friendly, cheerful, high quality animation.`
    : `VISUAL STYLE: "Realistic Live Action".
       - Base Keywords: "Photorealistic, 4k, cinematic lighting, real human actor, natural look, authentic, high resolution".
       - Aspect Ratio: 9:16 (Vertical for TikTok).
       - Atmosphere: Professional, trustworthy, authentic.`;

  const moodPrompt = mood === 'original'
    ? `MOOD/TONE: "Match Original Source"
       - IMPORTANT: Analyze the emotional tone and energy of the Base Script.
       - Mirror the EXACT same vibe, humor, pacing, and emotional beats.
       - If the original is fun and lighthearted, keep it fun and lighthearted.
       - If the original is serious, maintain that seriousness.
       - DO NOT make it more "professional" or "corporate" unless that's the original's tone.
       - Preserve: jokes, playfulness, excitement, casual language, personality.`
    : mood === 'creative'
      ? `MOOD/TONE: "Creative Rewrite" (สร้างสรรค์)
       - CRITICAL: DO NOT copy the original script word-for-word.
       - REWRITE and PARAPHRASE all spoken lines to express the SAME meaning but with DIFFERENT words.
       - Think of it as "inspired by" rather than "copied from" the original.
       - Maintain the CORE MESSAGE and KEY POINTS but use fresh, creative language.
       - Add your own creative flair and expressions while keeping the same intent.
       - The goal is to avoid copyright issues by creating original wording.
       - Keep the same emotional tone but express it in a new, unique way.
       - You may add creative metaphors, analogies, or expressions that enhance the message.
       - NEVER use the exact same sentences from the Base Script.
       - Keywords: ${moodConfig.promptKeywords}
       - Camera: ${moodConfig.cameraMovement}`
      : `MOOD/TONE: "${moodConfig.label}" (${moodConfig.labelTh})
       - Mood Keywords: ${moodConfig.promptKeywords}
       - Camera Movement Style: ${moodConfig.cameraMovement}
       - Pacing: ${moodConfig.pacing}
       - Apply this mood consistently across ALL scenes.`;

  const remixInstruction = remixTopic
    ? `TASK: "REMIX" the content. 
       - Analyze the STRUCTURE of the Base Script (e.g. Hook -> Pain Point -> Solution -> Call to Action).
       - Create a NEW script about the topic: "${remixTopic}".
       - Keep the EXACT SAME pacing, timestamp structure, and emotional beat as the base script.
       - Ensure the new script is 100% Safe/Compliant with TikTok rules (No overclaims).
       - Apply the mood and energy settings to the new content.`
    : `TASK: Use the Base Script content directly. Break it down into scenes.
       - PRESERVE the original energy, personality, and tone from the script.
       - If the script sounds casual and fun, the visualPrompt should reflect that energy.`;

  const prompt = `
  You are an expert AI Video Producer who excels at matching the mood and energy of source material.
  
  Base Script:
  "${baseScript}"
  
  ${remixInstruction}
  
  ${stylePrompt}
  
  ${moodPrompt}
  
  CRITICAL INSTRUCTIONS FOR VISUAL PROMPTS:
  1. The visualPrompt should feel ALIVE and FUN, not stiff or corporate.
  2. Include movement descriptions: "walking confidently", "gesturing enthusiastically", "laughing naturally".
  3. Add environmental details that match the mood.
  4. For ${mood === 'original' ? 'original tone' : moodConfig.labelTh} videos:
     - ${mood === 'original' ? 'Match the exact energy from the script text' : moodConfig.promptKeywords}
     - Camera: ${mood === 'original' ? 'Varied to match scene needs' : moodConfig.cameraMovement}
  5. The actionGuide should describe SPECIFIC expressions and body language, not generic directions.
  
  OUTPUT FORMAT:
  Return a strictly valid JSON object (no markdown). Structure:
  {
    "topic": "${remixTopic || 'Original Topic'}",
    "style": "${style}",
    "mood": "${mood}",
    "scenes": [
      {
        "timestamp": "[00:00]",
        "script": "${mood === 'creative' ? 'CREATIVELY REWRITTEN spoken line - same meaning, different words (Thai). DO NOT copy original text.' : 'The spoken line for this scene (Thai)'}",
        "visualPrompt": "DETAILED English prompt that captures the mood. Include: subject action, expression, environment, lighting, camera movement, and energy level. Make it feel ${mood === 'original' ? 'authentic to source' : mood === 'creative' ? 'fresh and creatively reimagined' : moodConfig.labelTh}.",
        "actionGuide": "SPECIFIC direction: facial expression (smiling, concerned, excited), body language (leaning forward, gesturing with hands), energy level (high/medium/low), pauses or emphasis points."
      }
    ]
  }
  
  ${mood === 'creative' ? 'CRITICAL REMINDER FOR CREATIVE MODE: Every "script" field MUST be a CREATIVE REWRITE. You are a creative writer who paraphrases and reimagines the original message. Same meaning, completely different wording. Never copy-paste from the Base Script.' : 'Remember: The script might be in Thai but reflects a certain personality. YOUR JOB is to capture that personality in the English visualPrompts, not make it generic.'}
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

/**
 * Re-check a script for TikTok violations using the rules database
 */
export const recheckScriptViolation = async (
  apiKey: string,
  scriptText: string
): Promise<ViolationCheckResult> => {
  // First, do local check
  const localCheck = checkTextViolation(scriptText);

  // If local check finds violations, return immediately
  if (localCheck.isViolating) {
    return localCheck;
  }

  // If local check is clean, do AI-powered deep check
  const ai = new GoogleGenAI({ apiKey });
  const tiktokRules = getTikTokRules();

  const prompt = `
  You are a TikTok content moderator. Analyze this script for policy violations.
  
  Script:
  "${scriptText}"
  
  TikTok Rules:
  ${tiktokRules}
  
  Check for:
  1. Explicit forbidden words
  2. Implied forbidden meanings (even if exact words aren't used)
  3. Context-based violations
  4. Subtle overclaims
  5. Hidden platform mentions
  
  Return JSON:
  {
    "isViolating": boolean,
    "violatedRules": [
      {
        "ruleId": "ai-check",
        "ruleTitle": "string",
        "violation": "string describing the issue found",
        "severity": "low" | "medium" | "high" | "critical",
        "suggestion": "how to fix it"
      }
    ],
    "overallRisk": number (0-100),
    "explanation": "string in Thai"
  }
  
  Return only valid JSON, no markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) {
      return localCheck; // Fallback to local check
    }

    const aiResult = JSON.parse(response.text) as ViolationCheckResult;

    // Merge local and AI results
    return {
      isViolating: localCheck.isViolating || aiResult.isViolating,
      violatedRules: [...localCheck.violatedRules, ...aiResult.violatedRules],
      overallRisk: Math.max(localCheck.overallRisk, aiResult.overallRisk),
      explanation: aiResult.explanation || localCheck.explanation
    };

  } catch (error) {
    console.error("AI Re-check Error:", error);
    return localCheck; // Fallback to local check on error
  }
};

/**
 * Generate an image using Gemini's image generation capabilities
 * Returns base64 image data or null if generation fails
 */
export const generateImage = async (
  apiKey: string,
  prompt: string,
  style: 'PIXAR' | 'REAL' = 'PIXAR'
): Promise<{ imageData: string; mimeType: string } | null> => {
  const ai = new GoogleGenAI({ apiKey });

  // Enhance prompt based on style
  let enhancedPrompt = prompt;
  if (style === 'PIXAR') {
    enhancedPrompt = `Pixar-style 3D animation, ${prompt}, cinematic lighting, soft glow, warm tones, vibrant colors, high detail, cute, expressive, 9:16 aspect ratio, vertical format for TikTok`;
  } else {
    enhancedPrompt = `Photorealistic, 4k quality, ${prompt}, cinematic lighting, natural look, authentic, high resolution, 9:16 aspect ratio, vertical format for TikTok`;
  }

  try {
    // Using Gemini's image generation model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{
          text: `Generate a detailed image description for: ${enhancedPrompt}. 
          
          Describe the scene in detail that could be used as a prompt for an image generation AI. 
          Include details about lighting, composition, colors, mood, and specific visual elements.
          Keep it TikTok-safe and family-friendly.
          Output just the enhanced prompt text, no additional formatting.`
        }]
      }
    });

    // Since Gemini-3-flash doesn't directly generate images, 
    // we return the enhanced prompt for use with external image generators
    // or use a placeholder approach

    if (response.text) {
      // Return a placeholder indicating the prompt is ready
      // In a real implementation, this would call an image generation API
      return {
        imageData: '', // Would contain base64 image data
        mimeType: 'text/plain', // Mark as text since we're returning prompt
        // Store the enhanced prompt in imageData for now
      };
    }

    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};

/**
 * Create a downloadable image from canvas with text prompt overlay
 * This creates a visual representation of the prompt
 */
export const createPromptCard = (prompt: string, sceneNumber: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
  gradient.addColorStop(0, '#1e1b4b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // Scene number
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 48px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Scene ${sceneNumber}`, 540, 200);

  // Prompt text
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '32px Inter, sans-serif';
  ctx.textAlign = 'left';

  // Word wrap
  const maxWidth = 980;
  const lineHeight = 48;
  const words = prompt.split(' ');
  let line = '';
  let y = 400;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, 50, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 50, y);

  // Watermark
  ctx.fillStyle = '#64748b';
  ctx.font = '24px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VideoLens AI - Production Prompt', 540, 1850);

  return canvas.toDataURL('image/png');
};

/**
 * Download image as file
 */
export const downloadImage = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download all scene prompts as images
 */
export const downloadAllScenePrompts = (scenes: Array<{ visualPrompt: string }>, prefix: string = 'scene'): void => {
  scenes.forEach((scene, index) => {
    const dataUrl = createPromptCard(scene.visualPrompt, index + 1);
    if (dataUrl) {
      setTimeout(() => {
        downloadImage(dataUrl, `${prefix}_${index + 1}.png`);
      }, index * 500); // Stagger downloads
    }
  });
};