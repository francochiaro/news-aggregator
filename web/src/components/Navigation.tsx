'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Summary' },
    { href: '/articles', label: 'Articles' },
    { href: '/chat', label: 'Chat' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav
      className="border-b"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <span
              className="font-semibold text-lg tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Newsletter Aggregator
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm transition-colors rounded-md ${
                    isActive ? 'font-semibold' : 'font-medium'
                  }`}
                  style={{
                    color: isActive
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                    backgroundColor: isActive
                      ? 'var(--color-bg-accent-subtle)'
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
