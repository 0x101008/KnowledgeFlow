
import { LLMConfig } from './types';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  temperature: 0.7,
  userLevel: 'beginner',
  soundEnabled: true,
  theme: 'light',
};

export const STORAGE_KEY_CONFIG = 'knowledge_flow_config';
export const STORAGE_KEY_HISTORY = 'knowledge_flow_history_v1';
