
export enum AppMode {
  RESEARCH = 'RESEARCH',
  IMAGING = 'IMAGING',
  LITERATURE = 'LITERATURE',
  ILLUSTRATION = 'ILLUSTRATION'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
  timestamp: Date; // Note: When saving/loading JSON, this becomes string, needs reparsing
  images?: string[]; // base64
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface AnalysisResult {
  markdown: string;
  confidence?: string;
}

export type FileData = {
  mimeType: string;
  data: string; // base64
  name: string;
};

export interface ChatSession {
  id: string;
  title: string;
  lastMessageAt: string; // ISO String
  preview: string;
}

export interface UserProfile {
  name: string;
  crm: string;
  specialty: string;
  clinic: string;
  theme: 'light' | 'dark';
  transcriptionMode: 'gemini' | 'browser'; // Gemini = High Accuracy (Server), Browser = Fast (Local)
}

// --- New Types for PDF Analysis ---

export interface InfographicData {
  title: string;
  keyPoints: string[];
  statistics: Array<{ label: string; value: string }>;
  conclusion: string;
}

export interface PresentationData {
  presentationTitle: string;
  slides: Array<{
    title: string;
    bulletPoints: string[];
    speakerNotes: string;
  }>;
}
