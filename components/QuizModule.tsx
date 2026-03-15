import React, { useState } from 'react';
import { QuizQuestion, KnowledgeNode } from '../types';
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Trophy } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface QuizModuleProps {
  node: KnowledgeNode;
  questions: QuizQuestion[];
  onFinish: (correctCount: number) => void;
  onClose: () => void;
}

const QuizModule: React.FC<QuizModuleProps> = ({ node, questions, onFinish, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = questions[currentIdx];
  const isCorrect = selectedIdx === currentQuestion?.correctIndex;

  const handleSelect = (idx: number) => {
    if (showExplanation) return;
    setSelectedIdx(idx);
  };

  const handleConfirm = () => {
    if (selectedIdx === null) return;
    if (isCorrect) setCorrectCount(prev => prev + 1);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedIdx(null);
      setShowExplanation(false);
    } else {
      onFinish(correctCount + (isCorrect ? 1 : 0));
    }
  };

  if (!currentQuestion) return null;

  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col md:p-6 lg:p-12 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-gray-800">{node.label}</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">第 {currentIdx + 1} / {questions.length} 题</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl text-blue-600 font-bold">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 relative">
        <div 
          className="h-full bg-blue-500 transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:py-12 flex flex-col gap-8">
          <div className="space-y-4">
             <h3 className="text-2xl font-bold text-gray-800 leading-tight">
              {currentQuestion.text}
            </h3>
          </div>

          <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedIdx === idx;
              const isOptionCorrect = idx === currentQuestion.correctIndex;
              let style = "bg-white border-2 border-gray-100 hover:border-blue-200";
              
              if (showExplanation) {
                if (isOptionCorrect) style = "bg-green-50 border-2 border-green-500 text-green-700 shadow-lg shadow-green-100 ring-2 ring-green-100";
                else if (isSelected && !isOptionCorrect) style = "bg-red-50 border-2 border-red-500 text-red-700 shadow-lg shadow-red-100 ring-2 ring-red-100";
                else style = "bg-gray-50 border-2 border-transparent opacity-40 grayscale";
              } else if (isSelected) {
                style = "bg-blue-50 border-2 border-blue-500 text-blue-700 shadow-xl shadow-blue-50 scale-[1.02]";
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

          {showExplanation && (
            <div className={`p-6 rounded-3xl animate-in slide-in-from-bottom duration-300 border-2 ${isCorrect ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${isCorrect ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {isCorrect ? <Trophy size={20} /> : <XCircle size={20} />}
                </div>
                <h4 className={`text-lg font-black ${isCorrect ? 'text-green-800' : 'text-orange-800'}`}>
                  {isCorrect ? '完全正确！太厉害了' : '非常遗憾，但没关系！'}
                </h4>
              </div>
              <MarkdownRenderer content={currentQuestion.explanation} />
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t bg-white flex justify-center sticky bottom-0">
        {!showExplanation ? (
          <button
            disabled={selectedIdx === null}
            onClick={handleConfirm}
            className="w-full max-w-md bg-blue-600 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            确认提交
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full max-w-md bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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