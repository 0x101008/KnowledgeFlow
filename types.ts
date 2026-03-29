
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

export type QuestionType = 'choice' | 'fill' | 'code' | 'qa';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // For choice
  correctIndex?: number; // For choice
  correctAnswer?: string; // For fill
  explanation: string;
  language?: string; // For code
  initialCode?: string; // For code
}

export interface QuizReport {
  id: string;
  topic: string;
  nodeId: string;
  nodeLabel: string;
  timestamp: number;
  correctCount: number;
  totalCount: number;
  summary: SummaryData;
}

export interface RadarData {
  subject: string;
  score: number;
}

export interface SummaryData {
  text: string;
  radar: RadarData[];
  details: string; // 新增详细报告内容
}

export interface HistoryItem {
  id: string;
  topic: string;
  nodes: KnowledgeNode[];
  lastAccessed: number;
  mode: GraphMode;
}

export type LLMProvider = 'gemini' | 'openai' | 'deepseek';
export type Language = 'zh' | 'en' | 'ja';
export type LearningStyle = 'professional' | 'humorous' | 'socratic';

export interface LLMConfig {
  provider: LLMProvider;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  temperature: number;
  userLevel: UserLevel;
  language: Language;
  learningStyle: LearningStyle;
  quizCount: number;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  generateReport: boolean;
}
