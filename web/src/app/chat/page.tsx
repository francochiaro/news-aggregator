'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Error: ${data.error || 'Something went wrong'}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Failed to connect to the server. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-12">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Chat
        </h1>
        <p
          className="mt-2 text-base"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Ask questions about your newsletter articles
        </p>
      </div>

      <div
        className="rounded-xl border flex flex-col h-[500px] sm:h-[600px]"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p
                className="mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Ask me anything about your articles
              </p>
              <p
                className="text-sm mb-8"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Responses are based only on your latest aggregation
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <p
                  className="text-xs font-medium mb-3"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Try asking:
                </p>
                {[
                  "What are the main topics covered this week?",
                  "Summarize the AI-related news",
                  "What companies were mentioned?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="block w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-border)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={{
                    backgroundColor: message.role === 'user'
                      ? 'var(--color-accent)'
                      : 'var(--color-bg-tertiary)',
                    color: message.role === 'user'
                      ? '#ffffff'
                      : 'var(--color-text-primary)',
                  }}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="animate-bounce h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-text-muted)' }}
                  />
                  <div
                    className="animate-bounce h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-text-muted)', animationDelay: '0.1s' }}
                  />
                  <div
                    className="animate-bounce h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-text-muted)', animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={sendMessage}
          className="border-t p-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your articles..."
              className="flex-1 px-4 py-3 text-sm rounded-xl border outline-none transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-bg-accent-subtle)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              Send
            </button>
          </div>
          <p
            className="mt-3 text-xs text-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Responses are based only on your newsletter articles
          </p>
        </form>
      </div>
    </div>
  );
}
