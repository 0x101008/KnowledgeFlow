
import { GoogleGenAI } from "@google/genai";
import { LLMConfig, KnowledgeNode, QuizQuestion, NodeStatus, GraphMode } from "../types";

export class LLMGateway {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private getStyleInstruction(): string {
    const styles = {
      professional: "客观准确，严谨专业，直击要点 (Professional, objective, accurate)",
      humorous: "幽默风趣，生动形象，多用有趣的日常比喻 (Humorous, vivid, use fun analogies)",
      socratic: "苏格拉底式启发，引导思考，多用反问和启发性语言 (Socratic, inspiring, thought-provoking)"
    };
    return styles[this.config.learningStyle] || styles.professional;
  }

  private getLanguageInstruction(): string {
    const langs = {
      zh: "简体中文 (Simplified Chinese)",
      en: "English",
      ja: "日本語 (Japanese)"
    };
    return langs[this.config.language] || langs.zh;
  }

  private async callProvider(prompt: string, jsonMode: boolean = false): Promise<string> {
    if (this.config.provider === 'gemini') {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: this.config.model || 'gemini-3-pro-preview',
          contents: prompt,
          config: {
            temperature: this.config.temperature,
            responseMimeType: jsonMode ? "application/json" : undefined,
          }
        });
        return response.text || "";
      } catch (error: any) {
        console.error(`[LLMGateway] Gemini Request Failed:`, error);
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error("API 请求频率超限或配额耗尽 (429)。请稍后再试，或检查您的 API Key 配额。");
        }
        throw new Error(`Gemini API 请求失败: ${errorMsg}`);
      }
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
        if (response.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(`API 请求频率超限或配额耗尽 (429)。请稍后再试，或检查您的 API Key 配额。\n详细信息: ${errorMsg}`);
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

  private extractJSON(text: string): any {
    try {
      // First try direct parse
      return JSON.parse(text);
    } catch (e) {
      // If direct parse fails, try to extract JSON from markdown or extra text
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch {}
      }
      
      // Last resort: try to clean up the string and parse again
      const cleanText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanText);
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
      语言要求: 必须使用 ${this.getLanguageInstruction()} 输出所有文本内容。
      风格要求: ${this.getStyleInstruction()}
      必须以纯 JSON 数组格式返回，包含字段: 
      id, label, description, dependencies (id 数组), parentId (如果是 mindmap), 
      examples (对象数组，每个包含 title, content, type['code'|'scenario'])。
      
      生成 4-5 个节点。请确保返回的是合法的 JSON 数组，不要包含任何其他文字。
    `;

    try {
      const text = await this.callProvider(prompt, true);
      const raw = this.extractJSON(text);
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
    const count = this.config.quizCount || 3;
    const level = this.config.userLevel;
    
    let prompt = '';
    if (level === 'beginner') {
      prompt = `主题:"${topic}",知识点:"${node.label}",难度:${level}。生成${count}道互不重复的单选题。
语言要求: 必须使用 ${this.getLanguageInstruction()} 输出所有文本内容。
风格要求: ${this.getStyleInstruction()}
JSON数组:[{"id":"q1","type":"choice","text":"问题","options":["A","B","C","D"],"correctIndex":0,"explanation":"极简解释(20字内)"}]。请确保返回合法的JSON数组。`;
    } else if (level === 'intermediate') {
      prompt = `主题:"${topic}",知识点:"${node.label}",难度:${level}。生成${count}道互不重复的填空题。
语言要求: 必须使用 ${this.getLanguageInstruction()} 输出所有文本内容。
风格要求: ${this.getStyleInstruction()}
JSON数组:[{"id":"q1","type":"fill","text":"问题描述，需要填空的地方用 ___ 表示","correctAnswer":"正确答案","explanation":"极简解释(20字内)"}]。请确保返回合法的JSON数组。`;
    } else {
      prompt = `主题:"${topic}",知识点:"${node.label}",难度:${level}。生成${count}道互不重复的深度思考题。
如果该知识点与编程、代码或软件开发直接相关，请生成编程题（type为"code"），包含字段：{"id":"q1","type":"code","text":"问题描述和要求","language":"javascript","initialCode":"// 请在此编写代码","correctAnswer":"参考答案或核心逻辑","explanation":"极简解释(20字内)"}。
如果该知识点与编程无关（如历史、艺术、管理、科学等），请生成文字简答题（type为"qa"），包含字段：{"id":"q1","type":"qa","text":"问题描述和要求","correctAnswer":"参考答案或核心要点","explanation":"极简解释(20字内)"}。
语言要求: 必须使用 ${this.getLanguageInstruction()} 输出所有文本内容。
风格要求: ${this.getStyleInstruction()}
请确保返回合法的JSON数组。`;
    }

    const text = await this.callProvider(prompt, true);
    const raw = this.extractJSON(text);
    const questions = Array.isArray(raw) ? raw : (raw.questions || []);
    
    // 去重处理
    const uniqueQuestions: QuizQuestion[] = [];
    const seen = new Set();
    for (const q of questions) {
      if (!seen.has(q.text)) {
        seen.add(q.text);
        uniqueQuestions.push(q);
      }
    }
    return uniqueQuestions;
  }

  async generateSummary(correctCount: number, total: number, nodeLabel: string): Promise<any> {
    const prompt = `用户完成"${nodeLabel}"测试,答对${correctCount}/${total}题。
语言要求: 必须使用 ${this.getLanguageInstruction()} 输出 text, details 和 subject。
风格要求: ${this.getStyleInstruction()}
返回纯JSON对象:
{"text":"极简评价(30字内)","details":"详细的学习报告，包含对用户当前掌握情况的分析、易错点提示以及下一步学习建议（约150-200字）。","radar":[{"subject":"基础记忆","score":80},{"subject":"逻辑分析","score":70},{"subject":"概念理解","score":90},{"subject":"应用能力","score":60},{"subject":"探索深度","score":85}]}
score根据正确率(0-100)推算。请确保返回合法的JSON对象。`;
    const text = await this.callProvider(prompt, true);
    return this.extractJSON(text);
  }

  async evaluateAnswer(question: QuizQuestion, userAnswer: string): Promise<{ isCorrect: boolean; output: string; feedback: string }> {
    const isCode = question.type === 'code';
    const prompt = `
      你是一个专业的导师。用户回答了一道${isCode ? '编程题' : '简答题'}。
      题目要求: ${question.text}
      参考答案/核心逻辑: ${question.correctAnswer || '无'}
      用户回答:
      ${isCode ? `\`\`\`${question.language || 'javascript'}\n${userAnswer}\n\`\`\`` : userAnswer}
      
      请评估用户的回答是否正确解决了问题或表达了核心观点。
      ${isCode ? '同时，请模拟运行用户的代码，并给出预期的控制台输出结果。' : '对于文字题，请判断用户的回答是否切中要害，意思相近即可算对。'}
      
      语言要求: 必须使用 ${this.getLanguageInstruction()} 输出 feedback 和 output。
      风格要求: ${this.getStyleInstruction()}
      
      必须以纯 JSON 对象格式返回:
      {
        "isCorrect": true/false,
        "output": "${isCode ? "模拟运行的输出结果（如果有打印或返回值），如果没有则填'无输出'" : "无输出"}",
        "feedback": "对回答的简短评价和改进建议（50字内）"
      }
    `;
    const text = await this.callProvider(prompt, true);
    return this.extractJSON(text);
  }

  async generateChildNodes(topic: string, parentNode: KnowledgeNode): Promise<KnowledgeNode[]> {
    const prompt = `
      基于主题 "${topic}"，用户当前已经学习到了节点 "${parentNode.label}" (${parentNode.description})。
      请为这个节点生成 2-3 个更深入的子节点（后续关卡）。
      语言要求: 必须使用 ${this.getLanguageInstruction()} 输出所有文本内容。
      风格要求: ${this.getStyleInstruction()}
      必须以纯 JSON 数组格式返回，包含字段: 
      id, label, description, dependencies (包含 "${parentNode.id}"), parentId (值为 "${parentNode.id}"), 
      examples (对象数组，每个包含 title, content, type['code'|'scenario'])。
      请确保返回的是合法的 JSON 数组。
    `;
    try {
      const text = await this.callProvider(prompt, true);
      const raw = this.extractJSON(text);
      const nodesArray = Array.isArray(raw) ? raw : (raw.nodes || []);
      
      return nodesArray.map((n: any, idx: number) => ({
        ...n,
        id: n.id || `node_${Date.now()}_${idx}`,
        status: NodeStatus.AVAILABLE,
        stars: 0,
        examples: n.examples || [],
        parentId: parentNode.id,
        dependencies: [parentNode.id]
      }));
    } catch (e) {
      console.error("Child Nodes Generation Failed:", e);
      throw e;
    }
  }
}
