'use client';

import { useState, useEffect } from 'react';
import ArticleCard from '@/components/ArticleCard';

interface Article {
  id: number;
  title: string;
  summary: string;
  source_url: string;
  newsletter_date: string;
  feedback: { isRelevant: boolean } | null;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/articles');
      const data = await res.json();

      if (data.articles) {
        setArticles(data.articles);
      }
    } catch (err) {
      setError('Failed to load articles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (articleId: number, isRelevant: boolean) => {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, isRelevant }),
      });

      if (res.ok) {
        setArticles(prev =>
          prev.map(a =>
            a.id === articleId ? { ...a, feedback: { isRelevant } } : a
          )
        );
      }
    } catch (err) {
      console.error('Failed to save feedback:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Loading articles...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-12">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Articles
        </h1>
        <p
          className="mt-2 text-base"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {articles.length} articles from your newsletters
        </p>
      </div>

      {articles.length === 0 ? (
        <div
          className="rounded-xl border py-16 px-8 text-center"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No articles yet
          </h2>
          <p
            className="max-w-sm mx-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Generate an aggregation to fetch articles from your newsletters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      )}
    </div>
  );
}
