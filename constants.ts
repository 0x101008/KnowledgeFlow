
import { LLMConfig } from './types';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  model: 'gemini-3-pro-preview',
  temperature: 0.7,
  userLevel: 'beginner',
  language: 'zh',
  learningStyle: 'humorous',
  quizCount: 3,
  soundEnabled: true,
  theme: 'light',
  generateReport: true,
};

export const STORAGE_KEY_CONFIG = 'knowledge_flow_config';
export const STORAGE_KEY_HISTORY = 'knowledge_flow_history_v1';
