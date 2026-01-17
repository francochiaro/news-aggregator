'use client';

import { useState } from 'react';

interface InsightCardProps {
  title: string;
  summary: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function InsightCard({
  title,
  summary,
  children,
  defaultExpanded = false,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Card Header - Always visible, clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 transition-colors"
        style={{ backgroundColor: 'transparent' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h3>
          {!isExpanded && summary && (
            <p
              className="text-sm line-clamp-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {summary}
            </p>
          )}
        </div>
        {/* Chevron indicator */}
        <div
          className="flex-shrink-0 mt-0.5 transition-transform duration-200"
          style={{
            color: 'var(--color-text-muted)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      {/* Card Content - Collapsible */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: isExpanded ? '1000px' : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div
          className="px-4 pb-4 pt-0 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
