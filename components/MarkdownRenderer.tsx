import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  theme?: 'light' | 'dark';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, theme = 'light' }) => {
  const isDark = theme === 'dark';

  return (
    <div className={`markdown-body prose ${isDark ? 'prose-invert' : ''} max-w-none`}>
      <Markdown remarkPlugins={[remarkGfm]}>
        {content}
      </Markdown>
    </div>
  );
};
