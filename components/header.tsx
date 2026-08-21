'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: '/', label: 'Overview' },
  { href: '/signals', label: 'Signals' },
  { href: '/companies', label: 'Companies' },
  { href: '/levers', label: 'Levers' },
];

export default function Header() {
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'x-refresh-secret': '' },
    });
    setRefreshing(false);
  }

  return (
    <header
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          height: 56,
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            C2C CI
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>dashboard</span>
        </div>

        <nav style={{ display: 'flex', gap: 2 }}>
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid rgba(88,166,255,0.3)',
              borderRadius: 'var(--radius)',
              padding: '4px 12px',
              fontSize: 12,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
}
