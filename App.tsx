
import React, { useState, useEffect, useMemo } from 'react';
import LZString from 'lz-string';
import { 
  LLMConfig, 
  KnowledgeNode, 
  NodeStatus, 
  QuizQuestion, 
  HistoryItem,
  GraphMode,
  SummaryData,
  QuizReport
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
  Trophy,
  X,
  Share2
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import KnowledgeGraph from './components/KnowledgeGraph';
import QuizModule from './components/QuizModule';
import Settings from './components/Settings';
import NodeDetailModal from './components/NodeDetailModal';
import { audio } from './utils/audio';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ShareModal } from './components/ShareModal';

const App: React.FC = () => {
  // --- States ---
  const [topic, setTopic] = useState('');
  const [searchMode, setSearchMode] = useState<GraphMode>('linear');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    let parsed = saved ? JSON.parse(saved) : null;
    if (parsed && parsed.provider === 'deepseek' && !parsed.apiKey) {
      parsed.provider = 'gemini';
      parsed.model = 'gemini-3-pro-preview';
    }
    return parsed ? { ...DEFAULT_LLM_CONFIG, ...parsed } : DEFAULT_LLM_CONFIG;
  });
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  const [reports, setReports] = useState<QuizReport[]>(() => {
    const saved = localStorage.getItem('knowledge_flow_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'graph' | 'quiz' | 'summary' | 'reports'>('home');
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [activeNode, setActiveNode] = useState<KnowledgeNode | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

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
    localStorage.setItem('knowledge_flow_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (config.theme === 'dark') {
      document.body.classList.add('bg-gray-900');
      document.body.classList.remove('bg-gray-50');
    } else {
      document.body.classList.add('bg-gray-50');
      document.body.classList.remove('bg-gray-900');
    }
  }, [config.theme]);

  // Handle shared report from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportParam = params.get('report');
    if (reportParam) {
      try {
        // Try LZString first
        let decompressed = LZString.decompressFromEncodedURIComponent(reportParam);
        let decoded;
        
        if (decompressed) {
          decoded = JSON.parse(decompressed);
        } else {
          // Fallback to old base64 method just in case
          decoded = JSON.parse(decodeURIComponent(atob(reportParam)));
        }

        if (decoded && decoded.summary) {
          setTopic(decoded.topic || '');
          setSummary(decoded.summary);
          setActiveView('summary');
          
          // Clean up the URL so refreshing doesn't keep showing the report if they navigate away
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('report');
          window.history.replaceState({}, '', newUrl.toString());
        }
      } catch (e) {
        console.error("Failed to parse shared report", e);
      }
    }
  }, []);

  const shareUrl = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      if (summary) {
        const shareData = { topic, summary };
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(shareData));
        url.searchParams.set('report', compressed);
      }
      return url.toString();
    } catch (e) {
      return window.location.href;
    }
  }, [summary, topic]);

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
      setErrorMessage(`构建失败: ${err.message || '请检查配置或尝试换个主题。'}`);
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
    if (config.soundEnabled) audio.playClick();
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
    } catch (err: any) {
      setErrorMessage(`无法生成测试题: ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizFinish = async (correctCount: number) => {
    if (!activeNode) return;
    
    if (config.soundEnabled) {
      if (correctCount > 0) audio.playUnlock();
      else audio.playError();
    }
    
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

    if (config.generateReport) {
      setLoading(true);
      setLoadingText('AI 正在生成学习报告...');
      try {
        const summaryData = await gateway.generateSummary(correctCount, activeQuestions.length, activeNode.label);
        setSummary(summaryData);
        
        // Save report
        const newReport: QuizReport = {
          id: `report_${Date.now()}`,
          topic,
          nodeId: activeNode.id,
          nodeLabel: activeNode.label,
          timestamp: Date.now(),
          correctCount,
          totalCount: activeQuestions.length,
          summary: summaryData
        };
        setReports(prev => [newReport, ...prev]);
        
        setActiveView('summary');
      } catch (err) {
        const fallbackSummary = {
          text: "完成了！你做得很棒。",
          details: "由于网络原因，未能生成详细的学习报告。但你已经成功完成了本次挑战，继续保持！",
          radar: [
            { subject: "基础记忆", score: 80 },
            { subject: "逻辑分析", score: 80 },
            { subject: "概念理解", score: 80 },
            { subject: "应用能力", score: 80 },
            { subject: "探索深度", score: 80 }
          ]
        };
        setSummary(fallbackSummary);
        
        // Save fallback report
        const newReport: QuizReport = {
          id: `report_${Date.now()}`,
          topic,
          nodeId: activeNode.id,
          nodeLabel: activeNode.label,
          timestamp: Date.now(),
          correctCount,
          totalCount: activeQuestions.length,
          summary: fallbackSummary
        };
        setReports(prev => [newReport, ...prev]);
        
        setActiveView('summary');
      } finally {
        setLoading(false);
      }
    } else {
      setActiveView('graph');
    }
  };

  const handleGenerateMore = async (parentNode: KnowledgeNode) => {
    setLoading(true);
    setLoadingText(`AI 正在为「${parentNode.label}」生成后续关卡...`);
    try {
      const newNodes = await gateway.generateChildNodes(topic, parentNode);
      const updatedNodes = [...nodes, ...newNodes];
      setNodes(updatedNodes);
      if (currentSessionId) updateHistory(currentSessionId, topic, updatedNodes, searchMode);
    } catch (err: any) {
      setErrorMessage(`生成后续关卡失败: ${err.message || '请重试。'}`);
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

  const deleteReport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const viewReport = (report: QuizReport) => {
    setSummary(report.summary);
    setActiveView('summary');
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
        {errorMessage && activeView !== 'home' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 p-4 bg-red-500/90 backdrop-blur-md border border-red-400 rounded-2xl flex items-center gap-3 text-white text-sm font-bold shadow-2xl animate-in slide-in-from-top">
            <AlertCircle size={20} />
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} className="ml-2 p-1 hover:bg-red-600 rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {history.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400"><Clock size={18} /><span className="text-sm font-black tracking-widest uppercase">最近学习</span></div>
                    <div className="grid grid-cols-1 gap-4">
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

                {reports.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400"><Trophy size={18} /><span className="text-sm font-black tracking-widest uppercase">历史报告</span></div>
                    <div className="grid grid-cols-1 gap-4">
                      {reports.map((report) => (
                        <div key={report.id} onClick={() => viewReport(report)} className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-green-500' : 'bg-white border-gray-100 hover:border-green-500 shadow-lg shadow-gray-100 hover:shadow-green-50'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-lg group-hover:text-green-500 transition-colors line-clamp-1">{report.nodeLabel}</h3>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setSummary(report.summary); setTopic(report.topic); setShowShareModal(true); }} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><Share2 size={14} /></button>
                              <button onClick={(e) => deleteReport(e, report.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div className={`text-sm mb-3 ${config.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            所属主题: {report.topic}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${config.theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                              {new Date(report.timestamp).toLocaleDateString()}
                            </span>
                            <span className={`text-sm font-bold ${report.correctCount === report.totalCount ? 'text-green-500' : 'text-blue-500'}`}>
                              得分: {Math.round((report.correctCount / report.totalCount) * 100)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'graph' && (
          <div className="flex-1 p-4 md:p-8 animate-in fade-in duration-500 flex flex-col gap-4">
            <KnowledgeGraph topic={topic} nodes={nodes} onNodeClick={handleNodeClick} onGenerateMore={handleGenerateMore} mode={searchMode} theme={config.theme} />
          </div>
        )}
        
        {activeView === 'quiz' && activeNode && activeQuestions.length > 0 && (
          <QuizModule node={activeNode} questions={activeQuestions} onFinish={handleQuizFinish} onClose={() => setActiveView('graph')} soundEnabled={config.soundEnabled} theme={config.theme} gateway={gateway} />
        )}

        {activeView === 'summary' && summary && (
          <div className={`flex-1 flex flex-col items-center p-6 space-y-8 animate-in zoom-in duration-500 overflow-y-auto ${config.theme === 'dark' ? 'bg-[#0f1115] text-white' : 'bg-[#F8F9FA] text-gray-900'}`}>
             <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-6 mt-8">
               <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-200 shrink-0"><Trophy size={48} /></div>
               <div className="space-y-4 max-w-2xl w-full">
                 <h2 className="text-4xl font-black">关卡达成！</h2>
                 <p className="text-xl font-bold text-blue-500">"{summary.text}"</p>
               </div>
             </div>
             
             <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className={`rounded-3xl shadow-sm border p-6 flex flex-col items-center justify-center min-h-[300px] ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                 <h3 className={`text-lg font-bold mb-4 ${config.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>能力雷达图</h3>
                 <div className="w-full h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <RadarChart cx="50%" cy="50%" outerRadius="70%" data={summary.radar}>
                       <PolarGrid stroke={config.theme === 'dark' ? '#374151' : '#e5e7eb'} />
                       <PolarAngleAxis dataKey="subject" tick={{ fill: config.theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12, fontWeight: 'bold' }} />
                       <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                       <Radar name="能力值" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.5} />
                     </RadarChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               <div className={`rounded-3xl shadow-sm border p-8 flex flex-col ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                 <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${config.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                   <Brain size={20} /> AI 深度学习报告
                 </h3>
                 <div className={`flex-1 text-base leading-relaxed ${config.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {summary.details ? (
                      <MarkdownRenderer content={summary.details} theme={config.theme} />
                    ) : (
                      <div className="flex items-center justify-center h-full opacity-50">暂无详细报告内容</div>
                    )}
                 </div>
               </div>
             </div>

             <div className="pb-12 flex gap-4 justify-center">
               <button onClick={() => setShowShareModal(true)} className="bg-green-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-2">
                 <Share2 size={20} /> 分享报告
               </button>
               <button onClick={() => setActiveView(currentSessionId ? 'graph' : 'home')} className="bg-blue-600 text-white font-black px-12 py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all shrink-0">
                 {currentSessionId ? '回到地图' : '返回首页'}
               </button>
             </div>
          </div>
        )}

        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)} 
          url={shareUrl} 
          title={`我在智图流完成了关于「${topic || '知识点'}」的学习，快来看看我的学习报告吧！`} 
          theme={config.theme} 
        />
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
//114514