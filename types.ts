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