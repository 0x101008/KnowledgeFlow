import React, { useState, useEffect } from 'react';
import { KnowledgeNode } from '../types';
import { X, Lightbulb, Play, Code, BookOpen, Edit3, Save, RotateCcw } from 'lucide-react';

interface NodeDetailModalProps {
  node: KnowledgeNode;
  onClose: () => void;
  onStartQuiz: () => void;
  onUpdateNode: (updates: Partial<KnowledgeNode>) => void;
  theme: 'light' | 'dark';
}

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose, onStartQuiz, onUpdateNode, theme }) => {
  const isDark = theme === 'dark';
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);
  const [editDesc, setEditDesc] = useState(node.description);

  useEffect(() => {
    setEditLabel(node.label);
    setEditDesc(node.description);
  }, [node]);

  const handleSave = () => {
    onUpdateNode({ label: editLabel, description: editDesc });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditLabel(node.label);
    setEditDesc(node.description);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        {/* Header */}
        <div className={`p-8 pb-4 flex justify-between items-start ${isDark ? 'bg-gray-800/50' : 'bg-blue-50/50'}`}>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest">
              <BookOpen size={14} /> 知识详解
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className={`text-3xl font-black tracking-tight w-full bg-transparent border-b-2 border-blue-500 outline-none pb-1 mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                autoFocus
              />
            ) : (
              <h2 className="text-3xl font-black tracking-tight">{node.label}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
               <button 
                onClick={() => setIsEditing(true)} 
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                title="编辑内容"
              >
                <Edit3 size={20} />
              </button>
            )}
            <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">概念描述</h3>
            </div>
            {isEditing ? (
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className={`w-full p-4 rounded-2xl border-2 border-blue-200 outline-none transition-all focus:border-blue-500 leading-relaxed ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800'}`}
              />
            ) : (
              <p className="text-lg leading-relaxed opacity-80">{node.description}</p>
            )}
          </section>

          {isEditing && (
            <div className="flex gap-4 pt-2">
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
              >
                <Save size={18} /> 保存修改
              </button>
              <button 
                onClick={handleCancel}
                className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <RotateCcw size={18} /> 取消
              </button>
            </div>
          )}

          {!isEditing && node.examples && node.examples.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Lightbulb className="text-yellow-500" size={18} /> 实战举例
              </h3>
              <div className="space-y-4">
                {node.examples.map((ex, i) => (
                  <div key={i} className={`p-6 rounded-3xl border-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-yellow-50/30 border-yellow-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {ex.type === 'code' ? <Code size={16} className="text-blue-500" /> : <Lightbulb size={16} className="text-orange-500" />}
                      <span className="font-black text-sm">{ex.title}</span>
                    </div>
                    <div className="opacity-90 leading-relaxed font-medium">
                      {ex.type === 'code' ? (
                        <pre className={`p-4 rounded-2xl overflow-x-auto text-sm font-mono mt-2 ${isDark ? 'bg-black/40' : 'bg-gray-900 text-gray-100'}`}>
                          <code>{ex.content}</code>
                        </pre>
                      ) : (
                        <p>{ex.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        {!isEditing && (
          <div className={`p-8 pt-4 flex gap-4 ${isDark ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
            <button 
              onClick={onStartQuiz}
              className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Play size={20} fill="currentColor" /> 开始知识测验
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailModal;