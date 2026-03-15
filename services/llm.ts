
import { GoogleGenAI } from "@google/genai";
import { LLMConfig, KnowledgeNode, QuizQuestion, NodeStatus, GraphMode } from "../types";

export class LLMGateway {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private async callProvider(prompt: string, jsonMode: boolean = false): Promise<string> {
    if (this.config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: this.config.model || 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          responseMimeType: jsonMode ? "application/json" : undefined,
        }
      });
      return response.text || "";
    }

    let baseUrl = this.config.baseUrl?.trim().replace(/\/+$/, "") || "";
    if (this.config.provider === 'openai' && !baseUrl) {
      baseUrl = "https://api.openai.com/v1";
    }
    if (this.config.provider === 'deepseek' && !baseUrl) {
      baseUrl = "https://api.deepseek.com/v1";
    }
    
    // DeepSeek JSON Mode Requirement: prompt MUST contain the word "json"
    let finalPrompt = prompt;
    if (jsonMode && this.config.provider === 'deepseek') {
      finalPrompt = `${prompt}\n\nIMPORTANT: Return only valid JSON. Do not include markdown code blocks. The response must be a JSON object or array.`;
    }

    const payload: any = {
      model: this.config.model,
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: this.config.temperature,
    };

    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMsg = `API Error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMsg = errorJson.error?.message || errorJson.message || errorMsg;
        } catch {
          errorMsg = errorBody || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
      console.error(`[LLMGateway] ${this.config.provider} Request Failed:`, error);
      
      // Handle CORS/Network errors specifically
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error(`${this.config.provider} API is unreachable. This is likely due to CORS restrictions or network blocks. Please try a proxy Base URL or check your network.`);
      }
      
      throw error;
    }
  }

  async generateGraph(topic: string, mode: GraphMode): Promise<KnowledgeNode[]> {
    const levelDesc = {
      beginner: "零基础，需要通俗易懂的解释",
      intermediate: "有一定的基础，希望深入核心原理",
      expert: "资深专家，侧重前沿技术和架构设计"
    }[this.config.userLevel];

    const modeInstructions = mode === 'mindmap' 
      ? `模式：思维导图（树状结构）。请生成一个清晰的知识树，核心主题为根节点，其下延伸出 2-3 个核心板块，每个板块再细分。`
      : `模式：闯关路径（线性结构）。请生成一个由浅入深的单向关卡序列。`;

    const prompt = `
      基于主题 "${topic}"，为 "${this.config.userLevel}" (${levelDesc}) 用户生成学习地图。
      ${modeInstructions}
      必须以纯 JSON 数组格式返回，包含字段: 
      id, label, description, dependencies (id 数组), parentId (如果是 mindmap), 
      examples (对象数组，每个包含 title, content, type['code'|'scenario'])。
      
      生成 6-8 个节点。
    `;

    try {
      const text = await this.callProvider(prompt, true);
      const cleanText = text.replace(/```json|```/g, "").trim();
      const raw = JSON.parse(cleanText);
      const nodesArray = Array.isArray(raw) ? raw : (raw.nodes || []);
      
      return nodesArray.map((n: any, idx: number) => ({
        ...n,
        id: n.id || `node_${Date.now()}_${idx}`,
        status: (n.dependencies?.length === 0 || idx === 0) ? NodeStatus.AVAILABLE : NodeStatus.LOCKED,
        stars: 0,
        examples: n.examples || []
      }));
    } catch (e) {
      console.error("Graph Generation Failed:", e);
      throw e;
    }
  }

  async generateQuiz(node: KnowledgeNode, topic: string): Promise<QuizQuestion[]> {
    const prompt = `为主题 "${topic}" 的知识点 "${node.label}" 生成 3 道单选题。JSON 数组格式返回，包含 text, options (4个), correctIndex, explanation。针对 ${this.config.userLevel} 等级。`;
    const text = await this.callProvider(prompt, true);
    const cleanText = text.replace(/```json|```/g, "").trim();
    const raw = JSON.parse(cleanText);
    const questions = Array.isArray(raw) ? raw : (raw.questions || []);
    return questions;
  }

  async generateSummary(correctCount: number, total: number, nodeLabel: string): Promise<string> {
    const prompt = `用户完成了 "${nodeLabel}" 关卡的学习与测试。表现：答对 ${correctCount} 题（共 ${total} 题）。
    请根据其正确率给出一段极具启发性且准确的评价。字数 50 字以内。`;
    return await this.callProvider(prompt);
  }
}
