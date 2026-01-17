'use client';

import { useState, useEffect } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import InsightCard from '@/components/InsightCard';
import { StructuredInsights, parseStructuredInsights } from '@/lib/ai/insights';

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

  // Parse structured insights or fallback to legacy format
  const structuredInsights: StructuredInsights | null = aggregation?.insights
    ? parseStructuredInsights(aggregation.insights)
    : null;

  const isLegacyInsights = aggregation?.insights && !structuredInsights;

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
      <div className="mb-8">
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
                backgroundColor: 'var(--color-accent)',
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
        <div>
          {/* Date Range Meta */}
          <div
            className="flex items-center justify-between py-3 px-4 rounded-lg mb-6"
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

          {/* Two-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Weekly Summary (60-65%) */}
            <div className="lg:w-[62%]">
              <div
                className="rounded-xl border p-6 sm:p-8 h-full"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <h2
                  className="text-lg font-semibold mb-6"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Weekly Summary
                </h2>
                <div className="prose-container" style={{ maxWidth: '65ch' }}>
                  <MarkdownRenderer content={aggregation.summary} />
                </div>
              </div>
            </div>

            {/* Right Column - Key Insights (35-40%) */}
            <div className="lg:w-[38%]">
              <div className="space-y-4">
                <h2
                  className="text-lg font-semibold mb-4"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Key Insights
                </h2>

                {/* Structured Insights Cards */}
                {structuredInsights ? (
                  <>
                    {/* Executive Overview - Expanded by default */}
                    <InsightCard
                      title="Executive Overview"
                      summary={structuredInsights.executiveOverview.mainInsight}
                      defaultExpanded={true}
                    >
                      <div className="space-y-4 pt-3">
                        {/* Main Insight */}
                        <div>
                          <h4
                            className="text-xs font-semibold uppercase tracking-wide mb-2"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            Main Insight
                          </h4>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {structuredInsights.executiveOverview.mainInsight}
                          </p>
                        </div>

                        {/* Key Themes */}
                        {structuredInsights.executiveOverview.keyThemes.length > 0 && (
                          <div>
                            <h4
                              className="text-xs font-semibold uppercase tracking-wide mb-2"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              Key Themes
                            </h4>
                            <div className="space-y-1.5">
                              {structuredInsights.executiveOverview.keyThemes.map((theme, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span style={{ color: 'var(--color-text-secondary)' }}>
                                    {theme.name}
                                  </span>
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: 'var(--color-bg-tertiary)',
                                      color: 'var(--color-text-muted)',
                                    }}
                                  >
                                    {theme.articleCount} articles
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Emerging Trends */}
                        {structuredInsights.executiveOverview.emergingTrends.length > 0 && (
                          <div>
                            <h4
                              className="text-xs font-semibold uppercase tracking-wide mb-2"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              Emerging Trends
                            </h4>
                            <ul className="space-y-1.5">
                              {structuredInsights.executiveOverview.emergingTrends.map((trend, i) => (
                                <li
                                  key={i}
                                  className="text-sm flex items-start gap-2"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  <span style={{ color: 'var(--color-accent)' }}>•</span>
                                  {trend}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </InsightCard>

                    {/* Market & Competitive Moves */}
                    {structuredInsights.marketMoves.bullets.length > 0 && (
                      <InsightCard
                        title="Market & Competitive Moves"
                        summary={structuredInsights.marketMoves.summary}
                      >
                        <ul className="space-y-2 pt-3">
                          {structuredInsights.marketMoves.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <span style={{ color: 'var(--color-accent)' }}>•</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </InsightCard>
                    )}

                    {/* Technology & Architecture Shifts */}
                    {structuredInsights.techShifts.bullets.length > 0 && (
                      <InsightCard
                        title="Technology & Architecture Shifts"
                        summary={structuredInsights.techShifts.summary}
                      >
                        <ul className="space-y-2 pt-3">
                          {structuredInsights.techShifts.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <span style={{ color: 'var(--color-accent)' }}>•</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </InsightCard>
                    )}

                    {/* Industry Impact & Use Cases */}
                    {structuredInsights.industryImpact.industries.length > 0 && (
                      <InsightCard
                        title="Industry Impact & Use Cases"
                        summary={structuredInsights.industryImpact.summary}
                      >
                        <div className="space-y-4 pt-3">
                          {structuredInsights.industryImpact.industries.map((industry, i) => (
                            <div key={i}>
                              <h4
                                className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                {industry.name}
                              </h4>
                              <ul className="space-y-1.5">
                                {industry.bullets.map((bullet, j) => (
                                  <li
                                    key={j}
                                    className="text-sm flex items-start gap-2"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                  >
                                    <span style={{ color: 'var(--color-accent)' }}>•</span>
                                    {bullet}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </InsightCard>
                    )}

                    {/* Economic & Policy Signals */}
                    {structuredInsights.policySignals.bullets.length > 0 && (
                      <InsightCard
                        title="Economic & Policy Signals"
                        summary={structuredInsights.policySignals.summary}
                      >
                        <ul className="space-y-2 pt-3">
                          {structuredInsights.policySignals.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <span style={{ color: 'var(--color-accent)' }}>•</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </InsightCard>
                    )}
                  </>
                ) : isLegacyInsights ? (
                  /* Legacy Insights - Single card with markdown */
                  <InsightCard
                    title="Key Insights"
                    summary="View the key insights from this week's articles"
                    defaultExpanded={true}
                  >
                    <div className="pt-3">
                      <MarkdownRenderer content={aggregation.insights!} />
                    </div>
                  </InsightCard>
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No insights available for this aggregation.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Article Count - Footer style */}
          <div
            className="flex items-center justify-between pt-6 mt-8 border-t"
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
