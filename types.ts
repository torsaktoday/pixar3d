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

export interface ProductionGuide {
  topic: string;
  style: string;
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