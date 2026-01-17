'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const components: Components = {
    h1: ({ children }) => (
      <h1
        className="text-2xl font-bold mb-4 mt-6 first:mt-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className="text-xl font-semibold mb-3 mt-5 first:mt-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className="text-lg font-medium mb-2 mt-4 first:mt-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className="text-base font-medium mb-2 mt-3 first:mt-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5
        className="text-sm font-medium mb-1 mt-2 first:mt-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6
        className="text-xs font-medium mb-1 mt-2 first:mt-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </h6>
    ),
    p: ({ children }) => (
      <p
        className="mb-4 leading-relaxed last:mb-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-2 transition-colors"
        style={{ color: 'var(--color-accent)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-accent-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-accent)';
        }}
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong
        className="font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    ul: ({ children }) => (
      <ul
        className="mb-4 ml-6 list-disc space-y-2 last:mb-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className="mb-4 ml-6 list-decimal space-y-2 last:mb-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed pl-1">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className="mb-4 pl-4 border-l-2 italic last:mb-0"
        style={{
          borderLeftColor: 'var(--color-accent)',
          color: 'var(--color-text-muted)',
        }}
      >
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded text-sm font-mono"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="block text-sm font-mono"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className="mb-4 p-4 rounded-lg overflow-x-auto text-sm last:mb-0"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-primary)',
        }}
      >
        {children}
      </pre>
    ),
    hr: () => (
      <hr
        className="my-6 border-0 h-px"
        style={{ backgroundColor: 'var(--color-border)' }}
      />
    ),
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
