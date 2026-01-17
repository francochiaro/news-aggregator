'use client';

import { useState, useEffect } from 'react';

interface AuthStatus {
  authenticated: boolean;
  expiresAt: string | null;
  email?: string;
}

export default function SettingsPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus({ authenticated: false, expiresAt: null });
    } catch (error) {
      console.error('Failed to logout:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-12">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Settings
        </h1>
        <p
          className="mt-2 text-base"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Manage your connections and preferences
        </p>
      </div>

      {/* Gmail Connection */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-lg font-medium mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Gmail Connection
        </h2>

        {loading ? (
          <div
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Checking connection status...
          </div>
        ) : authStatus?.authenticated ? (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-success-bg)' }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-success)' }}
                >
                  Connected to Gmail
                </p>
                {authStatus.expiresAt && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Token valid until {new Date(authStatus.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
              style={{
                color: 'var(--color-error)',
                borderColor: 'var(--color-error)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {loggingOut ? 'Disconnecting...' : 'Disconnect Gmail'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-warning-bg)' }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: 'var(--color-warning)' }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-warning)' }}
                >
                  Not connected
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Connect your Gmail to fetch TL;DR newsletters
                </p>
              </div>
            </div>

            <a
              href="/api/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect Gmail
            </a>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-lg font-medium mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Setup Required
        </h2>

        <div className="space-y-4">
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Before using the app, you need to configure the following:
          </p>

          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <h3
              className="text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              1. Environment Variables
            </h3>
            <p
              className="text-sm mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Create a{' '}
              <code
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                .env.local
              </code>{' '}
              file in the web directory with:
            </p>
            <pre
              className="p-3 rounded text-xs overflow-x-auto"
              style={{
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-success)',
              }}
            >
{`OPENAI_API_KEY=your_openai_key
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback`}
            </pre>
          </div>

          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <h3
              className="text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              2. Google Cloud Console
            </h3>
            <ol
              className="text-sm list-decimal list-inside space-y-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <li>Go to Google Cloud Console</li>
              <li>Create a new project or select existing</li>
              <li>Enable the Gmail API</li>
              <li>Create OAuth 2.0 credentials (Web application)</li>
              <li>
                Add{' '}
                <code
                  className="px-1 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  http://localhost:3000
                </code>{' '}
                to authorized origins
              </li>
              <li>
                Add{' '}
                <code
                  className="px-1 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  http://localhost:3000/api/auth/callback
                </code>{' '}
                to redirect URIs
              </li>
            </ol>
          </div>

          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <h3
              className="text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              3. OpenAI API Key
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'var(--color-accent)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-accent)';
                }}
              >
                OpenAI Platform
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-lg font-medium mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          About
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Newsletter Aggregator helps you stay on top of your TL;DR newsletters by
          automatically fetching, summarizing, and organizing articles with AI-powered
          insights.
        </p>
        <p
          className="text-xs mt-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Version 1.0 - Local-first MVP
        </p>
      </div>
    </div>
  );
}
