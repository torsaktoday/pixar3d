export enum AnalysisMode {
  SUMMARY = 'SUMMARY',
  TRANSCRIPT = 'TRANSCRIPT',
  KEY_POINTS = 'KEY_POINTS',
  SAFETY = 'SAFETY'
}

export interface AnalysisResult {
  text: string;
  mode: AnalysisMode;
  timestamp: number;
}

export interface FileData {
  file?: File;
  url?: string;
  previewUrl: string;
  type: 'file' | 'url';
  mimeType: string;
}

export type ProcessingStatus = 'idle' | 'uploading' | 'fetching' | 'analyzing' | 'completed' | 'error';

export interface ProductionScene {
  timestamp: string;
  script: string;
  visualPrompt: string;
  actionGuide: string;
}

// Video Motion/Mood Types - 7 Thai-focused options
export type VideoMood =
  | 'original'      // ตามต้นฉบับ - Default
  | 'excited'       // ตื่นเต้นเร้าใจ
  | 'energetic'     // กระฉับกระเฉง
  | 'emotional'     // เศร้าซึ้ง
  | 'cinematic'     // อลังการภาพยนตร์
  | 'creative'      // สร้างสรรค์ - AI คิดใหม่ไม่ copy
  | 'funny';        // ตลกสนุก - มีสาระแต่บันเทิง


export interface VideoMoodConfig {
  id: VideoMood;
  label: string;
  labelTh: string;
  emoji: string;
  description: string;
  promptKeywords: string;
  cameraMovement: string;
  pacing: string;
}

export interface ProductionGuide {
  topic: string;
  style: string;
  mood?: VideoMood;
  scenes: ProductionScene[];
}

// TikTok Rules Management Types
export interface TikTokRule {
  id: string;
  category: RuleCategory;
  title: string;
  description: string;
  forbiddenWords: string[];
  forbiddenPairings: Array<{ word1: string; word2: string }>;
  examples: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type RuleCategory =
  | 'overclaims'
  | 'medical_supplement'
  | 'forbidden_pairings'
  | 'violence_safety'
  | 'platform_mentions'
  | 'before_after'
  | 'other';

export interface RulesMetadata {
  lastUpdated: number;
  totalRules: number;
  activeRules: number;
  source: string;
  version: string;
}

export interface ViolationCheckResult {
  isViolating: boolean;
  violatedRules: Array<{
    ruleId: string;
    ruleTitle: string;
    violation: string;
    severity: string;
    suggestion: string;
  }>;
  overallRisk: number;
  explanation: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  prompt: string;
  timestamp: number;
}

export type AdminView = 'dashboard' | 'rules' | 'search' | 'generator';