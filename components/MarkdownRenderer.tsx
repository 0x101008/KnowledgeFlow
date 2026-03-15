import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // A simplified custom markdown renderer to avoid heavy dependencies, 
  // or we could use react-markdown if available. 
  // For this environment, we'll implement a clean card-based viewer.
  
  const parseContent = (text: string) => {
    // Basic regex for code blocks and links
    const parts = text.split(/```/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const [lang, ...code] = part.split('\n');
        return (
          <div key={i} className="my-4 rounded-lg bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-x-auto shadow-inner">
            <div className="text-xs text-gray-500 mb-2 uppercase">{lang}</div>
            <pre><code>{code.join('\n')}</code></pre>
          </div>
        );
      }
      return <div key={i} className="whitespace-pre-wrap mb-4 leading-relaxed">{part}</div>;
    });
  };

  return <div className="text-gray-700">{parseContent(content)}</div>;
};

export default MarkdownRenderer;