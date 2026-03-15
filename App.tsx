
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LLMConfig, 
  KnowledgeNode, 
  NodeStatus, 
  QuizQuestion, 
  HistoryItem,
  GraphMode
} from './types';
import { STORAGE_KEY_CONFIG, STORAGE_KEY_HISTORY, DEFAULT_LLM_CONFIG } from './constants';
import { LLMGateway } from './services/llm';
import { 
  Search, 
  Brain, 
  Sparkles, 
  Loader2, 
  Settings as SettingsIcon, 
  AlertCircle,
  Home,
  Clock,
  ChevronRight,
  Trash2,
  GitBranch,
  ListOrdered,
  Trophy
} from 'lucide-react';
import KnowledgeGraph from './components/KnowledgeGraph';
import QuizModule from './components/QuizModule';
import Settings from './components/Settings';
import NodeDetailModal from './components/NodeDetailModal';

const App: React.FC = () => {
  // --- States ---
  const [topic, setTopic] = useState('');
  const [searchMode, setSearchMode] = useState<GraphMode>('linear');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    return saved ? JSON.parse(saved) : DEFAULT_LLM_CONFIG;
  });
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'graph' | 'quiz' | 'summary'>('home');
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [activeNode, setActiveNode] = useState<KnowledgeNode | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [summary, setSummary] = useState('');

  const gateway = useMemo(() => new LLMGateway(config), [config]);

  const SUGGESTED_TOPICS = [
    { label: 'Python 核心基础', icon: '🐍' },
    { label: '文艺复兴艺术史', icon: '🎨' },
    { label: '量子力学入门', icon: '⚛️' },
    { label: '咖啡冲煮指南', icon: '☕' },
    { label: '深度学习实战', icon: '🤖' },
    { label: '摄影构图美学', icon: '📸' },
    { label: '个人理财规划', icon: '💰' },
    { label: '心理学基础', icon: '🧠' },
    { label: '世界地理漫游', icon: '🌍' },
    { label: '古典音乐鉴赏', icon: '🎵' },
    { label: '时间管理技巧', icon: '⏳' },
    { label: '宇宙探索史', icon: '🚀' }
  ];

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (config.theme === 'dark') {
      document.body.classList.add('bg-gray-900');
      document.body.classList.remove('bg-gray-50');
    } else {
      document.body.classList.add('bg-gray-50');
      document.body.classList.remove('bg-gray-900');
    }
  }, [config.theme]);

  // --- Actions ---
  const startJourney = async (existingHistory?: HistoryItem, overrideTopic?: string) => {
    const targetTopic = overrideTopic || topic;
    if (!existingHistory && !targetTopic.trim()) return;
    
    if (existingHistory) {
      setTopic(existingHistory.topic);
      setNodes(existingHistory.nodes);
      setCurrentSessionId(existingHistory.id);
      setSearchMode(existingHistory.mode);
      setActiveView('graph');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setLoadingText('AI 正在构建知识蓝图...');
    try {
      const graphNodes = await gateway.generateGraph(targetTopic, searchMode);
      const newId = `session_${Date.now()}`;
      setNodes(graphNodes);
      setCurrentSessionId(newId);
      updateHistory(newId, targetTopic, graphNodes, searchMode);
      setActiveView('graph');
    } catch (err: any) {
      setErrorMessage('构建失败，请检查配置或尝试换个主题。');
    } finally {
      setLoading(false);
    }
  };

  const updateNode = (id: string, updates: Partial<KnowledgeNode>) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    setNodes(newNodes);
    if (currentSessionId) updateHistory(currentSessionId, topic, newNodes, searchMode);
  };

  const handleQuickTopic = (t: string) => {
    setTopic(t);
    startJourney(undefined, t);
  };

  const handleNodeClick = (node: KnowledgeNode) => {
    setActiveNode(node);
    setShowDetail(true);
  };

  const startQuiz = async () => {
    if (!activeNode) return;
    setShowDetail(false);
    setLoading(true);
    setLoadingText(`AI 正在为「${activeNode.label}」出题...`);
    try {
      const questions = await gateway.generateQuiz(activeNode, topic);
      setActiveQuestions(questions);
      setActiveView('quiz');
    } catch (err) {
      setErrorMessage('无法生成测试题。');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizFinish = async (correctCount: number) => {
    if (!activeNode) return;
    
    const updatedNodes = nodes.map(n => {
      if (n.id === activeNode.id) {
        const stars = Math.min(3, Math.ceil((correctCount / activeQuestions.length) * 3));
        return { ...n, status: NodeStatus.COMPLETED, stars };
      }
      return n;
    });

    const finalNodes = updatedNodes.map((n, idx) => {
      if (n.status === NodeStatus.LOCKED) {
        if (searchMode === 'linear') {
          const activeIdx = updatedNodes.findIndex(node => node.id === activeNode.id);
          if (idx === activeIdx + 1) return { ...n, status: NodeStatus.AVAILABLE };
        } else if (searchMode === 'mindmap') {
          if (n.parentId === activeNode.id) return { ...n, status: NodeStatus.AVAILABLE };
          if (!n.parentId && n.dependencies.includes(activeNode.id)) return { ...n, status: NodeStatus.AVAILABLE };
        }
      }
      return n;
    });

    setNodes(finalNodes);
    if (currentSessionId) updateHistory(currentSessionId, topic, finalNodes, searchMode);

    setLoading(true);
    setLoadingText('AI 正在总结本次表现并生成评价...');
    try {
      const summaryText = await gateway.generateSummary(correctCount, activeQuestions.length, activeNode.label);
      setSummary(summaryText);
      setActiveView('summary');
    } catch (err) {
      setSummary("完成了！你做得很棒。");
      setActiveView('summary');
    } finally {
      setLoading(false);
    }
  };

  const updateHistory = (id: string, topicName: string, updatedNodes: KnowledgeNode[], mode: GraphMode) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== id);
      return [{ id, topic: topicName, nodes: updatedNodes, lastAccessed: Date.now(), mode }, ...filtered].slice(0, 10);
    });
  };

  const deleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none transition-colors duration-300 ${config.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`h-16 border-b px-6 flex items-center justify-between z-20 shrink-0 ${config.theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView('home')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
            <Brain className="text-white" size={18} />
          </div>
          <span className="text-xl font-black tracking-tight">智图流</span>
        </div>
        <div className="flex items-center gap-2">
          {activeView !== 'home' && (
            <button onClick={() => setActiveView('home')} className={`p-2 rounded-full transition-colors flex items-center gap-2 px-3 ${config.theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <Home size={20} /><span className="text-sm font-bold hidden sm:inline">首页</span>
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className={`p-2 rounded-full transition-colors ${config.theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <SettingsIcon size={20} />
          </button>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeView === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto pt-12">
            <div className="max-w-2xl w-full space-y-12 animate-in fade-in slide-in-from-bottom duration-700">
              <div className="text-center space-y-6">
                <div className="relative inline-block">
                  <div className={`absolute -inset-4 rounded-full blur-2xl opacity-50 animate-pulse ${config.theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`} />
                  <Sparkles size={56} className="text-blue-600 relative" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-black leading-tight">探索知识的流向</h1>
                  <p className="text-lg opacity-60 font-medium">即时构建你的专属技能地图</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className={`p-1 rounded-2xl flex gap-1 ${config.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200/50'}`}>
                    <button onClick={() => setSearchMode('linear')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${searchMode === 'linear' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}><ListOrdered size={16} /> 闯关路径</button>
                    <button onClick={() => setSearchMode('mindmap')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${searchMode === 'mindmap' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}><GitBranch size={16} /> 思维导图</button>
                  </div>
                </div>

                <div className="relative group">
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && startJourney()} placeholder="输入任何想学习的主题..." className={`w-full p-6 pl-14 text-xl border-2 rounded-3xl shadow-xl outline-none transition-all group-hover:border-blue-500 ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white shadow-black/20' : 'bg-white border-gray-100 shadow-gray-100'}`} />
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" size={24} />
                  <button disabled={!topic || loading} onClick={() => startJourney()} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 transition-all">{loading ? <Loader2 className="animate-spin" size={24} /> : <ChevronRight size={24} />}</button>
                </div>

                {/* Suggested Topics (举例) */}
                <div className="flex flex-wrap justify-center gap-3">
                  {SUGGESTED_TOPICS.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => handleQuickTopic(t.label)}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-bold flex items-center gap-2 transition-all active:scale-95 ${config.theme === 'dark' ? 'border-gray-800 bg-gray-800/50 hover:border-blue-500 hover:text-blue-400' : 'border-gray-100 bg-white hover:border-blue-500 hover:text-blue-600 shadow-sm'}`}
                    >
                      <span>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                {errorMessage && <div className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold"><AlertCircle size={20} />{errorMessage}</div>}
              </div>

              {history.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400"><Clock size={18} /><span className="text-sm font-black tracking-widest uppercase">最近学习</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {history.map((item) => (
                      <div key={item.id} onClick={() => startJourney(item)} className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'bg-white border-gray-100 hover:border-blue-500 shadow-lg shadow-gray-100 hover:shadow-blue-50'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-black text-lg group-hover:text-blue-500 transition-colors line-clamp-1">{item.topic}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${config.theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{item.mode === 'mindmap' ? '思维导图' : '闯关'}</span>
                            <button onClick={(e) => deleteHistory(e, item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-gray-100/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${Math.round((item.nodes.filter(n => n.status === 'COMPLETED').length / item.nodes.length) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'graph' && (
          <div className="flex-1 p-4 md:p-8 animate-in fade-in duration-500 flex flex-col gap-4">
            <KnowledgeGraph topic={topic} nodes={nodes} onNodeClick={handleNodeClick} mode={searchMode} />
          </div>
        )}
        
        {activeView === 'quiz' && activeNode && activeQuestions.length > 0 && (
          <QuizModule node={activeNode} questions={activeQuestions} onFinish={handleQuizFinish} onClose={() => setActiveView('graph')} />
        )}

        {activeView === 'summary' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in zoom-in duration-500">
             <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-200"><Trophy size={48} /></div>
             <div className="space-y-4 max-w-lg">
               <h2 className="text-3xl font-black">关卡达成！</h2>
               <p className="text-xl opacity-80 leading-relaxed font-medium">"{summary}"</p>
             </div>
             <button onClick={() => setActiveView('graph')} className="bg-blue-600 text-white font-black px-12 py-4 rounded-2xl shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all">回到地图</button>
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xl font-black text-white">{loadingText}</p>
        </div>
      )}

      {showDetail && activeNode && (
        <NodeDetailModal 
          node={activeNode} 
          onClose={() => setShowDetail(false)} 
          onStartQuiz={startQuiz} 
          onUpdateNode={(updates) => updateNode(activeNode.id, updates)}
          theme={config.theme} 
        />
      )}

      {showSettings && (
        <Settings config={config} onUpdate={(newConfig) => { setConfig(newConfig); localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig)); }} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default App;
