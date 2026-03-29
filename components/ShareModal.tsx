import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Twitter, Facebook, Share2, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  theme: 'light' | 'dark';
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title, theme }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareLinks = [
    {
      name: '微博',
      icon: <Share2 size={20} />,
      url: `http://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      color: 'bg-red-500 hover:bg-red-600 text-white'
    },
    {
      name: 'Twitter',
      icon: <Twitter size={20} />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      color: 'bg-black hover:bg-gray-800 text-white'
    },
    {
      name: 'Facebook',
      icon: <Facebook size={20} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  ];

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900 border border-gray-100'}`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-black mb-6 text-center">分享学习报告</h2>

        <div className="flex flex-col items-center mb-8">
          <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-white' : 'bg-gray-50'}`}>
            <QRCodeSVG value={url} size={160} level="H" includeMargin={false} />
          </div>
          <p className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <MessageCircle size={16} /> 微信扫一扫分享
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-transform hover:scale-105 active:scale-95 ${link.color}`}
            >
              {link.icon}
              <span className="text-xs font-bold">{link.name}</span>
            </a>
          ))}
        </div>

        <div className="relative">
          <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <input
              type="text"
              readOnly
              value={url}
              className={`flex-1 px-3 py-2 text-sm bg-transparent outline-none truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 shadow-sm border border-gray-200'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
