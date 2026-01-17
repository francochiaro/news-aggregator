'use client';

import { useState, useEffect } from 'react';
import DateRangePicker from '@/components/DateRangePicker';

interface Aggregation {
  id: number;
  start_date: string;
  end_date: string;
  summary: string;
  insights: string | null;
  created_at: string;
}

interface Article {
  id: number;
  title: string;
  summary: string;
  source_url: string;
  newsletter_date: string;
}

export default function SummaryPage() {
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchLatestAggregation();
  }, []);

  const fetchLatestAggregation = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/aggregation/latest');
      const data = await res.json();

      if (data.aggregation) {
        setAggregation(data.aggregation);
        setArticles(data.articles || []);
      }
    } catch (err) {
      setError('Failed to load aggregation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runWeeklyAggregation = async () => {
    try {
      setGenerating(true);
      setError(null);

      const res = await fetch('/api/aggregation/weekly', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate aggregation');
      }

      setAggregation(data.aggregation);
      await fetchLatestAggregation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate aggregation');
    } finally {
      setGenerating(false);
    }
  };

  const runCustomAggregation = async (startDate: string, endDate: string) => {
    try {
      setGenerating(true);
      setError(null);
      setShowDatePicker(false);

      const res = await fetch('/api/aggregation/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate aggregation');
      }

      setAggregation(data.aggregation);
      await fetchLatestAggregation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate aggregation');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Weekly Summary
            </h1>
            <p
              className="mt-2 text-base"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Your TL;DR newsletter digest
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border w-full sm:w-auto"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Custom Range
            </button>
            <button
              onClick={runWeeklyAggregation}
              disabled={generating}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              style={{
                backgroundColor: generating ? 'var(--color-accent)' : 'var(--color-accent)',
              }}
              onMouseEnter={(e) => {
                if (!generating) {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              {generating ? 'Generating...' : 'Generate Weekly'}
            </button>
          </div>
        </div>
      </div>

      {showDatePicker && (
        <div className="mb-6">
          <DateRangePicker
            onGenerate={runCustomAggregation}
            onCancel={() => setShowDatePicker(false)}
            disabled={generating}
          />
        </div>
      )}

      {error && (
        <div
          className="mb-8 px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      {generating && (
        <div
          className="mb-8 px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-info-bg)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="animate-spin h-4 w-4 border-2 rounded-full"
              style={{
                borderColor: 'var(--color-border)',
                borderTopColor: 'var(--color-accent)',
              }}
            />
            <span>Generating aggregation... This may take a minute.</span>
          </div>
        </div>
      )}

      {!aggregation ? (
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
            No summaries yet
          </h2>
          <p
            className="mb-8 max-w-sm mx-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Connect your Gmail and generate your first weekly summary to get started.
          </p>
          <button
            onClick={runWeeklyAggregation}
            disabled={generating}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={(e) => {
              if (!generating) {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            Generate First Summary
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Date Range Meta */}
          <div
            className="flex items-center justify-between py-3 px-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <span
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {formatDate(aggregation.start_date)} — {formatDate(aggregation.end_date)}
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Generated {formatDate(aggregation.created_at)}
            </span>
          </div>

          {/* Summary Card */}
          <div
            className="rounded-xl border p-6 sm:p-8"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2
              className="text-lg font-medium mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Summary
            </h2>
            <div className="max-w-prose">
              {aggregation.summary.split('\n').map((paragraph, i) => (
                paragraph ? (
                  <p
                    key={i}
                    className="mb-4 leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {paragraph}
                  </p>
                ) : null
              ))}
            </div>
          </div>

          {/* Insights Card */}
          {aggregation.insights && (
            <div
              className="rounded-xl border-l-4 p-6 sm:p-8"
              style={{
                backgroundColor: 'var(--color-bg-accent-subtle)',
                borderLeftColor: 'var(--color-accent)',
              }}
            >
              <h2
                className="text-lg font-medium mb-6"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Key Insights
              </h2>
              <div className="space-y-3">
                {aggregation.insights.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <h3
                        key={i}
                        className="text-base font-medium mt-6 mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {line.replace(/\*\*/g, '')}
                      </h3>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <p
                        key={i}
                        className="pl-4 leading-relaxed"
                        style={{
                          color: 'var(--color-text-secondary)',
                          borderLeft: '2px solid var(--color-border)',
                        }}
                      >
                        {line.substring(2)}
                      </p>
                    );
                  }
                  return line ? (
                    <p
                      key={i}
                      className="leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {line}
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Article Count - Footer style */}
          <div
            className="flex items-center justify-between pt-6 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {articles.length} articles in this digest
            </p>
            <a
              href="/articles"
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--color-accent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
            >
              View all articles →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
