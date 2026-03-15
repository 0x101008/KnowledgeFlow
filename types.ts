
export enum NodeStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED',
}

export type GraphMode = 'linear' | 'mindmap';
export type UserLevel = 'beginner' | 'intermediate' | 'expert';

export interface KnowledgeNodeExample {
  title: string;
  content: string;
  type: 'code' | 'scenario';
}

export interface KnowledgeNode {
  id: string;
  label: string;
  description: string;
  status: NodeStatus;
  stars: number;
  dependencies: string[];
  parentId?: string;
  examples?: KnowledgeNodeExample[]; // 新增：实战举例
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface HistoryItem {
  id: string;
  topic: string;
  nodes: KnowledgeNode[];
  lastAccessed: number;
  mode: GraphMode;
}

export type LLMProvider = 'gemini' | 'openai' | 'deepseek';

export interface LLMConfig {
  provider: LLMProvider;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  temperature: number;
  userLevel: UserLevel;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
}
