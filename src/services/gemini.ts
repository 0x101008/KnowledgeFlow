import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  parentId: string;
}

export interface QuestData {
  lesson: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export async function generateSkillTree(topic: string): Promise<SkillNode[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `You are an expert educator. Create a learning skill tree for the topic: "${topic}".
The output MUST be a JSON array of nodes.
Each node must have:
- id: a unique string identifier
- title: the name of the concept (in Chinese)
- description: a brief description of what will be learned (in Chinese)
- parentId: the id of the parent node (use an empty string "" for the root node)

Keep the tree depth to a maximum of 4 levels, and total nodes around 8-12. Make sure there is exactly ONE root node (parentId = "").`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            parentId: { type: Type.STRING, description: 'ID of parent node. Empty string for root.' },
          },
          required: ['id', 'title', 'description', 'parentId'],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error('Failed to generate skill tree');
  return JSON.parse(text) as SkillNode[];
}

export async function generateQuest(nodeTitle: string, mainTopic: string): Promise<QuestData> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `You are an expert educator teaching a student about "${nodeTitle}" in the context of "${mainTopic}".
Provide a short, engaging lesson (about 2-3 paragraphs) explaining the core concepts.
Then, create a multiple-choice question to test their understanding.

The output MUST be a valid JSON object with the following structure:
{
  "lesson": "The lesson content in Markdown format (in Chinese)",
  "question": "The multiple choice question (in Chinese)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerIndex": 0 // The index of the correct option (0 to 3)
}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lesson: { type: Type.STRING, description: 'Markdown formatted lesson content' },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correctAnswerIndex: { type: Type.INTEGER },
        },
        required: ['lesson', 'question', 'options', 'correctAnswerIndex'],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error('Failed to generate quest');
  return JSON.parse(text) as QuestData;
}
