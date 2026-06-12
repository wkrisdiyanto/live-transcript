export enum TranscriptionSource {
  MIC = "MICROPHONE",
  SCREEN = "SCREEN_AUDIO",
}

export enum TranscriptionLanguage {
  ID = "id-ID",
  EN = "en-US",
}

export interface TranscriptSegment {
  id: string;
  timestamp: string; // duration elapsed e.g. "00:-5"
  text: string;
  source: TranscriptionSource;
  isFinal: boolean; // whether Web Speech finished or Gemini transcribed chunk
}

export interface AISubtopic {
  name: string;
  detail: string;
}

export interface AISessionSummary {
  title: string;
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  topics: AISubtopic[];
}

export interface SavedSession {
  id: string;
  dateTime: string; // ISO date format
  name: string;
  sourceType: string;
  language: TranscriptionLanguage;
  rawTranscript: string;
  segments: TranscriptSegment[];
  summary: AISessionSummary | null;
}
