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
        <div className="text-gray-500">Loading...</div>
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

          <div className="flex gap-3">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border"
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
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {generating && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Generating aggregation... This may take a minute.</span>
          </div>
        </div>
      )}

      {!aggregation ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No summaries yet</h2>
          <p className="text-gray-600 mb-6">
            Connect your Gmail and generate your first weekly summary to get started.
          </p>
          <button
            onClick={runWeeklyAggregation}
            disabled={generating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Generate First Summary
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Date Range Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <span>📅</span>
              <span>
                {formatDate(aggregation.start_date)} — {formatDate(aggregation.end_date)}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Generated {formatDate(aggregation.created_at)}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="prose prose-gray max-w-none">
              {aggregation.summary.split('\n').map((paragraph, i) => (
                <p key={i} className="text-gray-700 mb-3">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Insights Card */}
          {aggregation.insights && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Insights</h2>
              <div className="prose prose-gray max-w-none">
                {aggregation.insights.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <h3 key={i} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                        {line.replace(/\*\*/g, '')}
                      </h3>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={i} className="text-gray-700 ml-4">
                        {line.substring(2)}
                      </li>
                    );
                  }
                  return line ? (
                    <p key={i} className="text-gray-700 mb-2">
                      {line}
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Article Count */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Articles Included</h3>
                <p className="text-gray-600">{articles.length} articles in this digest</p>
              </div>
              <a
                href="/articles"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
