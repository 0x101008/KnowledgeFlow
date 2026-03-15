import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { QuestData, generateQuest, SkillNode } from '../services/gemini';
import { Loader2, X, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface QuestProps {
  node: SkillNode;
  mainTopic: string;
  onClose: () => void;
  onComplete: (nodeId: string) => void;
}

export function Quest({ node, mainTopic, onClose, onComplete }: QuestProps) {
  const [questData, setQuestData] = useState<QuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchQuest() {
      try {
        setLoading(true);
        const data = await generateQuest(node.title, mainTopic);
        if (isMounted) {
          setQuestData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '加载任务失败');
          setLoading(false);
        }
      }
    }

    fetchQuest();
    return () => { isMounted = false; };
  }, [node, mainTopic]);

  const handleOptionClick = (index: number) => {
    if (isCorrect !== null) return; // Prevent changing answer after submission
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || !questData) return;
    
    const correct = selectedOption === questData.correctAnswerIndex;
    setIsCorrect(correct);
  };

  const handleContinue = () => {
    if (isCorrect) {
      onComplete(node.id);
    } else {
      // Reset to try again
      setSelectedOption(null);
      setIsCorrect(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-bold text-white">{node.title}</h2>
            <p className="text-slate-400 text-sm mt-1">{node.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 size={48} className="text-blue-500 animate-spin" />
              <p className="text-slate-400 animate-pulse">AI 正在为您生成专属课程...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-red-400">
              <XCircle size={48} />
              <p>{error}</p>
              <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">返回</button>
            </div>
          ) : questData ? (
            <div className="space-y-8">
              {/* Lesson */}
              <div className="prose prose-invert prose-blue max-w-none">
                <div className="markdown-body text-slate-300 leading-relaxed">
                  <Markdown>{questData.lesson}</Markdown>
                </div>
              </div>

              <div className="h-px bg-slate-800 w-full" />

              {/* Quiz */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">知识测验</span>
                  {questData.question}
                </h3>
                
                <div className="grid gap-3">
                  {questData.options.map((option, index) => {
                    const isSelected = selectedOption === index;
                    const isCorrectAnswer = index === questData.correctAnswerIndex;
                    const showCorrect = isCorrect !== null && isCorrectAnswer;
                    const showWrong = isCorrect !== null && isSelected && !isCorrectAnswer;

                    return (
                      <button
                        key={index}
                        onClick={() => handleOptionClick(index)}
                        disabled={isCorrect !== null}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group",
                          {
                            "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 text-slate-300": !isSelected && isCorrect === null,
                            "border-blue-500 bg-blue-500/10 text-blue-100": isSelected && isCorrect === null,
                            "border-emerald-500 bg-emerald-500/10 text-emerald-100": showCorrect,
                            "border-red-500 bg-red-500/10 text-red-100": showWrong,
                            "opacity-50 cursor-not-allowed": isCorrect !== null && !showCorrect && !showWrong
                          }
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-medium",
                            {
                              "border-slate-600 text-slate-400 group-hover:border-slate-500": !isSelected && isCorrect === null,
                              "border-blue-500 text-blue-400": isSelected && isCorrect === null,
                              "border-emerald-500 text-emerald-400": showCorrect,
                              "border-red-500 text-red-400": showWrong,
                            }
                          )}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                        </span>
                        
                        {showCorrect && <CheckCircle2 className="text-emerald-500" />}
                        {showWrong && <XCircle className="text-red-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {questData && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur flex justify-end">
            {isCorrect === null ? (
              <button
                onClick={handleSubmit}
                disabled={selectedOption === null}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                提交答案
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 text-white",
                  isCorrect ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-700 hover:bg-slate-600"
                )}
              >
                {isCorrect ? "完成学习" : "再试一次"}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
