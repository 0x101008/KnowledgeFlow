import React, { useState } from 'react';
import { QuizQuestion, KnowledgeNode } from '../types';
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Trophy, Play, Loader2 } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { audio } from '../utils/audio';
import { LLMGateway } from '../services/llm';

interface QuizModuleProps {
  node: KnowledgeNode;
  questions: QuizQuestion[];
  onFinish: (correctCount: number) => void;
  onClose: () => void;
  soundEnabled?: boolean;
  theme?: 'light' | 'dark';
  gateway: LLMGateway;
}

const QuizModule: React.FC<QuizModuleProps> = ({ node, questions, onFinish, onClose, soundEnabled = true, theme = 'light', gateway }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{ isCorrect: boolean; output: string; feedback: string } | null>(null);

  const currentQuestion = questions[currentIdx];
  const isDark = theme === 'dark';

  // Initialize code answer when question changes
  React.useEffect(() => {
    if (currentQuestion?.type === 'code') {
      setCodeAnswer(currentQuestion.initialCode || '');
    } else {
      setCodeAnswer('');
    }
    setTextAnswer('');
    setQaAnswer('');
    setSelectedIdx(null);
    setShowExplanation(false);
    setCodeFeedback(null);
  }, [currentIdx, currentQuestion]);

  const isCorrect = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === 'choice') {
      return selectedIdx === currentQuestion.correctIndex;
    } else if (currentQuestion.type === 'fill') {
      return textAnswer.trim().toLowerCase() === (currentQuestion.correctAnswer || '').trim().toLowerCase();
    } else if (currentQuestion.type === 'code' || currentQuestion.type === 'qa') {
      return codeFeedback?.isCorrect || false;
    }
    return false;
  };

  const handleSelect = (idx: number) => {
    if (showExplanation) return;
    if (soundEnabled) audio.playClick();
    setSelectedIdx(idx);
  };

  const handleConfirm = async () => {
    if (currentQuestion?.type === 'choice' && selectedIdx === null) return;
    if (currentQuestion?.type === 'fill' && !textAnswer.trim()) return;
    if (currentQuestion?.type === 'code' && !codeAnswer.trim()) return;
    if (currentQuestion?.type === 'qa' && !qaAnswer.trim()) return;

    let correct = false;

    if (currentQuestion?.type === 'code' || currentQuestion?.type === 'qa') {
      setIsEvaluating(true);
      try {
        const answerToEval = currentQuestion.type === 'code' ? codeAnswer : qaAnswer;
        const result = await gateway.evaluateAnswer(currentQuestion, answerToEval);
        setCodeFeedback(result);
        correct = result.isCorrect;
      } catch (e) {
        console.error("Evaluation failed", e);
        setCodeFeedback({ isCorrect: false, output: '评估失败', feedback: '无法连接到 AI 评估服务，请重试。' });
        correct = false;
      } finally {
        setIsEvaluating(false);
      }
    } else {
      correct = isCorrect();
    }

    if (correct) {
      setCorrectCount(prev => prev + 1);
      if (soundEnabled) audio.playSuccess();
    } else {
      if (soundEnabled) audio.playError();
    }
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onFinish(correctCount);
    }
  };

  if (!currentQuestion) return null;

  const progress = ((currentIdx + 1) / questions.length) * 100;
  const currentIsCorrect = isCorrect();

  return (
    <div className={`fixed inset-0 z-50 flex flex-col md:p-6 lg:p-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
        <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{node.label}</h2>
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>第 {currentIdx + 1} / {questions.length} 题</p>
        </div>
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`h-1.5 w-full relative ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div 
          className="h-full bg-blue-500 transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:py-12 flex flex-col gap-8">
          <div className="space-y-4">
             <h3 className={`text-2xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {currentQuestion.text}
            </h3>
          </div>

          {currentQuestion.type === 'choice' && (
            <div className="space-y-4">
              {currentQuestion.options?.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isOptionCorrect = idx === currentQuestion.correctIndex;
                let style = isDark ? "bg-gray-800 border-2 border-gray-700 hover:border-blue-500/50 text-gray-200" : "bg-white border-2 border-gray-100 hover:border-blue-200 text-gray-800";
                
                if (showExplanation) {
                  if (isOptionCorrect) style = isDark ? "bg-green-900/20 border-2 border-green-500/50 text-green-400 shadow-lg shadow-green-900/20 ring-2 ring-green-500/20" : "bg-green-50 border-2 border-green-500 text-green-700 shadow-lg shadow-green-100 ring-2 ring-green-100";
                  else if (isSelected && !isOptionCorrect) style = isDark ? "bg-red-900/20 border-2 border-red-500/50 text-red-400 shadow-lg shadow-red-900/20 ring-2 ring-red-500/20" : "bg-red-50 border-2 border-red-500 text-red-700 shadow-lg shadow-red-100 ring-2 ring-red-100";
                  else style = isDark ? "bg-gray-800/50 border-2 border-transparent opacity-40 grayscale text-gray-400" : "bg-gray-50 border-2 border-transparent opacity-40 grayscale text-gray-500";
                } else if (isSelected) {
                  style = isDark ? "bg-blue-900/20 border-2 border-blue-500 text-blue-400 shadow-xl shadow-blue-900/20 scale-[1.02]" : "bg-blue-50 border-2 border-blue-500 text-blue-700 shadow-xl shadow-blue-50 scale-[1.02]";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full p-5 rounded-2xl transition-all duration-200 text-left font-semibold flex items-center justify-between ${style}`}
                  >
                    <span className="flex-1">{option}</span>
                    {showExplanation && isOptionCorrect && <CheckCircle size={24} className="text-green-500" />}
                    {showExplanation && isSelected && !isOptionCorrect && <XCircle size={24} className="text-red-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'fill' && (
            <div className="space-y-4">
              <input
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={showExplanation}
                placeholder="请输入你的答案..."
                className={`w-full p-5 text-lg border-2 rounded-2xl outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' : 'bg-white border-gray-200 focus:border-blue-500 text-gray-800'}`}
              />
              {showExplanation && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                  <span className="font-bold">正确答案：</span> {currentQuestion.correctAnswer}
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === 'code' && (
            <div className="space-y-4">
              <textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                disabled={showExplanation || isEvaluating}
                placeholder="// 请在此编写代码..."
                className={`w-full h-64 p-5 font-mono text-sm border-2 rounded-2xl outline-none transition-all resize-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-800'}`}
              />
              {showExplanation && codeFeedback && (
                <div className={`p-4 rounded-xl space-y-2 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                  <div>
                    <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>预期输出：</span>
                    <pre className={`mt-1 p-3 rounded-lg text-sm overflow-x-auto ${isDark ? 'bg-black text-green-400' : 'bg-gray-900 text-green-400'}`}>
                      {codeFeedback.output}
                    </pre>
                  </div>
                  <div>
                    <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>AI 评价：</span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{codeFeedback.feedback}</p>
                  </div>
                  <div className="pt-2">
                    <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>参考答案：</span>
                    <pre className={`mt-1 p-3 rounded-lg text-sm overflow-x-auto ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-200 text-gray-800'}`}>
                      {currentQuestion.correctAnswer}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === 'qa' && (
            <div className="space-y-4">
              <textarea
                value={qaAnswer}
                onChange={(e) => setQaAnswer(e.target.value)}
                disabled={showExplanation || isEvaluating}
                placeholder="请在此输入你的回答..."
                className={`w-full h-48 p-5 text-base border-2 rounded-2xl outline-none transition-all resize-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-800'}`}
              />
              {showExplanation && codeFeedback && (
                <div className={`p-4 rounded-xl space-y-2 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                  <div>
                    <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>AI 评价：</span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{codeFeedback.feedback}</p>
                  </div>
                  <div className="pt-2">
                    <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>参考答案：</span>
                    <pre className={`mt-1 p-3 rounded-lg text-sm whitespace-pre-wrap ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-200 text-gray-800'}`}>
                      {currentQuestion.correctAnswer}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {showExplanation && (
            <div className={`p-6 rounded-3xl animate-in slide-in-from-bottom duration-300 border-2 ${currentIsCorrect ? (isDark ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-100') : (isDark ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50 border-orange-100')}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${currentIsCorrect ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {currentIsCorrect ? <Trophy size={20} /> : <XCircle size={20} />}
                </div>
                <h4 className={`text-lg font-black ${currentIsCorrect ? (isDark ? 'text-green-400' : 'text-green-800') : (isDark ? 'text-orange-400' : 'text-orange-800')}`}>
                  {currentIsCorrect ? '完全正确！太厉害了' : '非常遗憾，但没关系！'}
                </h4>
              </div>
              <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                <MarkdownRenderer content={currentQuestion.explanation} theme={theme} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className={`p-4 border-t flex justify-center sticky bottom-0 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        {!showExplanation ? (
          <button
            disabled={(currentQuestion.type === 'choice' && selectedIdx === null) || (currentQuestion.type === 'fill' && !textAnswer.trim()) || (currentQuestion.type === 'code' && !codeAnswer.trim()) || (currentQuestion.type === 'qa' && !qaAnswer.trim()) || isEvaluating}
            onClick={handleConfirm}
            className={`w-full max-w-md bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            {isEvaluating ? <><Loader2 className="animate-spin" size={20} /> 正在评估...</> : ((currentQuestion.type === 'code' || currentQuestion.type === 'qa') ? <><Play size={20} /> 提交并评估</> : '确认提交')}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full max-w-md bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {currentIdx < questions.length - 1 ? '下一题' : '完成闯关'}
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizModule;