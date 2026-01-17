'use client';

interface Article {
  id: number;
  title: string;
  summary: string;
  source_url: string;
  newsletter_date: string;
  feedback: { isRelevant: boolean } | null;
}

interface ArticleCardProps {
  article: Article;
  onFeedback: (articleId: number, isRelevant: boolean) => void;
}

export default function ArticleCard({ article, onFeedback }: ArticleCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className="rounded-xl border p-6 transition-colors"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
      }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium transition-colors inline-flex items-center gap-1"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
          >
            <span className="line-clamp-2">{article.title}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>↗</span>
          </a>

          <p
            className="mt-2 text-sm leading-relaxed line-clamp-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {article.summary}
          </p>

          <div
            className="mt-3 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatDate(article.newsletter_date)}
          </div>
        </div>

        {/* Feedback Buttons */}
        <div className="flex sm:flex-col gap-2 sm:gap-1.5 flex-shrink-0">
          <button
            onClick={() => onFeedback(article.id, true)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: article.feedback?.isRelevant === true
                ? 'var(--color-success-bg)'
                : 'transparent',
              color: article.feedback?.isRelevant === true
                ? 'var(--color-success)'
                : 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => {
              if (article.feedback?.isRelevant !== true) {
                e.currentTarget.style.backgroundColor = 'var(--color-success-bg)';
                e.currentTarget.style.color = 'var(--color-success)';
              }
            }}
            onMouseLeave={(e) => {
              if (article.feedback?.isRelevant !== true) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }
            }}
            title="Mark as relevant"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          </button>

          <button
            onClick={() => onFeedback(article.id, false)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: article.feedback?.isRelevant === false
                ? 'var(--color-error-bg)'
                : 'transparent',
              color: article.feedback?.isRelevant === false
                ? 'var(--color-error)'
                : 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => {
              if (article.feedback?.isRelevant !== false) {
                e.currentTarget.style.backgroundColor = 'var(--color-error-bg)';
                e.currentTarget.style.color = 'var(--color-error)';
              }
            }}
            onMouseLeave={(e) => {
              if (article.feedback?.isRelevant !== false) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }
            }}
            title="Mark as not relevant"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
