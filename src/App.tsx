import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Sparkles, Loader2, Trophy } from 'lucide-react';
import { generateSkillTree, SkillNode } from './services/gemini';
import { SkillTree } from './components/SkillTree';
import { Quest } from './components/Quest';

export default function App() {
  const [topicInput, setTopicInput] = useState('');
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeQuestNode, setActiveQuestNode] = useState<SkillNode | null>(null);

  const handleStartLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const generatedNodes = await generateSkillTree(topicInput);
      setNodes(generatedNodes);
      setCurrentTopic(topicInput);
      setCompletedNodeIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成技能树失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node: SkillNode) => {
    setActiveQuestNode(node);
  };

  const handleQuestComplete = (nodeId: string) => {
    setCompletedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    setActiveQuestNode(null);
  };

  const progress = nodes.length > 0 ? Math.round((completedNodeIds.size / nodes.length) * 100) : 0;
  const isAllCompleted = nodes.length > 0 && completedNodeIds.size === nodes.length;

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-800/60 bg-[#0a0f1c]/80 backdrop-blur-md z-40 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">AI 智学图谱</h1>
        </div>
        
        {currentTopic && (
          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-400">
              当前学习: <span className="text-white font-medium">{currentTopic}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm font-mono text-blue-400">{progress}%</span>
            </div>
            <button 
              onClick={() => {
                setCurrentTopic(null);
                setNodes([]);
                setTopicInput('');
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              重新开始
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen flex flex-col">
        {!currentTopic ? (
          // Landing / Input Screen
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl w-full text-center space-y-8 relative z-10"
            >
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
                  构建你的<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">技能树</span>
                </h2>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  输入你想学习的任何主题，AI 将为你实时生成结构化的知识图谱，并通过互动闯关助你掌握核心概念。
                </p>
              </div>

              <form onSubmit={handleStartLearning} className="relative max-w-xl mx-auto">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="例如：量子力学、React 开发、法国大革命..."
                  className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xl"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !topicInput.trim()}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  生成路径
                </button>
              </form>

              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 py-2 px-4 rounded-lg inline-block">
                  {error}
                </p>
              )}
            </motion.div>
          </div>
        ) : (
          // Skill Tree Screen
          <div className="flex-1 p-6 flex flex-col relative">
            {isAllCompleted && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-10 left-1/2 -translate-x-1/2 z-30 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg shadow-emerald-500/10 backdrop-blur-md"
              >
                <Trophy size={20} className="text-emerald-400" />
                <span className="font-medium">恭喜！你已完成「{currentTopic}」的所有学习节点！</span>
              </motion.div>
            )}
            
            <div className="flex-1 w-full max-w-6xl mx-auto relative">
              <SkillTree 
                nodes={nodes} 
                completedNodeIds={completedNodeIds} 
                onNodeClick={handleNodeClick} 
              />
            </div>
          </div>
        )}
      </main>

      {/* Quest Modal */}
      <AnimatePresence>
        {activeQuestNode && currentTopic && (
          <Quest
            node={activeQuestNode}
            mainTopic={currentTopic}
            onClose={() => setActiveQuestNode(null)}
            onComplete={handleQuestComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
