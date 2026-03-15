
import React from 'react';
import { LLMConfig, LLMProvider, UserLevel } from '../types';
import { Settings as SettingsIcon, X, Moon, Sun, Volume2, VolumeX, GraduationCap, Globe, Key, Link } from 'lucide-react';

interface SettingsProps {
  config: LLMConfig;
  onUpdate: (config: LLMConfig) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onUpdate, onClose }) => {
  const levels: { value: UserLevel; label: string; desc: string }[] = [
    { value: 'beginner', label: '入门小白', desc: '基础概念，易于理解' },
    { value: 'intermediate', label: '进阶选手', desc: '核心原理，实战技巧' },
    { value: 'expert', label: '资深专家', desc: '底层逻辑，架构思维' }
  ];

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as LLMProvider;
    let model = config.model;
    let baseUrl = config.baseUrl;

    if (provider === 'deepseek') {
      model = 'deepseek-chat';
      baseUrl = 'https://api.deepseek.com/v1';
    } else if (provider === 'openai') {
      model = 'gpt-4o';
      baseUrl = 'https://api.openai.com/v1';
    } else if (provider === 'gemini') {
      model = 'gemini-3-pro-preview';
      baseUrl = '';
    }
    
    onUpdate({ ...config, provider, model, baseUrl });
  };

  const isGemini = config.provider === 'gemini';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] ${config.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className="p-6 border-b border-gray-100/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold">偏好与引擎配置</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Provider Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
              <Globe size={14} /> AI 引擎服务商
            </div>
            <select 
              value={config.provider}
              onChange={handleProviderChange}
              className={`w-full p-4 rounded-2xl border-2 outline-none transition-all focus:border-blue-500 ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek (默认)</option>
            </select>
          </section>

          {/* Credentials - Only for non-Gemini providers as per system instructions */}
          {!isGemini && (
            <section className="space-y-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
                <Key size={14} /> API 密钥 (Credentials)
              </div>
              <input 
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => onUpdate({ ...config, apiKey: e.target.value })}
                className={`w-full p-4 rounded-2xl border-2 outline-none transition-all focus:border-blue-500 ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
                placeholder="输入您的 API Key..."
              />
              
              <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest pt-2">
                <Link size={14} /> 接口地址 (Base URL)
              </div>
              <input 
                type="text"
                value={config.baseUrl || ''}
                onChange={(e) => onUpdate({ ...config, baseUrl: e.target.value })}
                className={`w-full p-4 rounded-2xl border-2 outline-none transition-all focus:border-blue-500 ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
                placeholder="例如: https://api.deepseek.com/v1"
              />
            </section>
          )}

          {/* Model Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
               模型名称
            </div>
            <input 
              type="text"
              value={config.model}
              onChange={(e) => onUpdate({ ...config, model: e.target.value })}
              className={`w-full p-4 rounded-2xl border-2 outline-none transition-all focus:border-blue-500 ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
              placeholder="例如: gpt-4o 或 deepseek-chat"
            />
          </section>

          {/* User Level */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
              <GraduationCap size={14} /> 学习难度
            </div>
            <div className="grid grid-cols-1 gap-2">
              {levels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => onUpdate({ ...config, userLevel: level.value })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${config.userLevel === level.value ? 'border-blue-500 bg-blue-50/10' : 'border-transparent hover:bg-gray-100/10'}`}
                >
                  <div className="font-bold">{level.label}</div>
                  <div className="text-xs opacity-60">{level.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Appearance & Sound */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
              偏好设置
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onUpdate({ ...config, theme: config.theme === 'dark' ? 'light' : 'dark' })}
                className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
              >
                {config.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span className="font-bold">{config.theme === 'dark' ? '浅色模式' : '深色模式'}</span>
              </button>
              <button 
                onClick={() => onUpdate({ ...config, soundEnabled: !config.soundEnabled })}
                className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all ${config.soundEnabled ? 'bg-blue-50/10 border-blue-500 text-blue-500' : 'bg-gray-50 border-gray-100'}`}
              >
                {config.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span className="font-bold">音效</span>
              </button>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-gray-100/10 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            保存并返回
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
