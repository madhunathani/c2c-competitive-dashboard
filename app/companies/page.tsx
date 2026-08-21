'use client';

import { useState, useMemo } from 'react';
import signalsData from '@/data/processed/signals.json';
import type { Signal } from '@/lib/taxonomy';
import { COMPANIES } from '@/lib/taxonomy';
import CompanySummary from '@/components/company-summary';
import { groupBy } from '@/lib/utils';

const ALL_SIGNALS = signalsData as Signal[];

const COMPANY_DOMAINS: Record<string, string> = {
  'Amazon': 'amazon.com',
  'Depop': 'depop.com',
  'Etsy': 'etsy.com',
  'Facebook Marketplace': 'facebook.com',
  'Fleek': 'fleek.fashion',
  'Groupon': 'groupon.com',
  'Influur': 'influur.com',
  'Kleinanzeigen': 'kleinanzeigen.de',
  'Mercari': 'mercari.com',
  'Pickle': 'pickle.com',
  'Poshmark': 'poshmark.com',
  'Promoted': 'promoted.ai',
  'StockX': 'stockx.com',
  'Temu': 'temu.com',
  'USPS': 'usps.com',
  'Vinted': 'vinted.com',
  'Whatnot': 'whatnot.com',
  'Wikifarmer': 'wikifarmer.com',
};

const PINNED_COMPANIES = [
  'Poshmark',
  'Facebook Marketplace',
  'Vinted',
  'Etsy',
  'Whatnot',
  'Amazon',
];

const COMPANY_COLORS: Record<string, string> = {
  'Amazon': '#f0883e',
  'Depop': '#bc8cff',
  'Etsy': '#e8834a',
  'Facebook Marketplace': '#58a6ff',
  'Fleek': '#a8b1ff',
  'Groupon': '#79c551',
  'Influur': '#e879f9',
  'Kleinanzeigen': '#00a550',
  'Mercari': '#3fb950',
  'Pickle': '#86efac',
  'Poshmark': '#f85149',
  'Promoted': '#94a3b8',
  'StockX': '#00b140',
  'Temu': '#fb923c',
  'USPS': '#004b87',
  'Vinted': '#56d364',
  'Whatnot': '#d29922',
  'Wikifarmer': '#84cc16',
};

function CompanyLogo({ company, size = 20 }: { company: string; size?: number }) {
  const domain = COMPANY_DOMAINS[company];
  const color = COMPANY_COLORS[company] ?? '#8b949e';
  const initial = company.charAt(0).toUpperCase();
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          background: `${color}33`,
          border: `1px solid ${color}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.55,
          fontWeight: 700,
          color,
          flexShrink: 0,
        }}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={company}
      width={size}
      height={size}
      style={{ borderRadius: 3, flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

function shortName(company: string): string {
  const map: Record<string, string> = {
    'Facebook Marketplace': 'FB Mkt.',
    'Wikifarmer': 'Wikifarm.',
  };
  return map[company] ?? company;
}

export default function CompaniesPage() {
  const [selected, setSelected] = useState<string>('all');
  const [search, setSearch] = useState('');

  const byCompany = useMemo(() => groupBy(ALL_SIGNALS, (s) => s.company), []);

  const companies = useMemo(() => {
    const rest = COMPANIES.filter((c) => !PINNED_COMPANIES.includes(c)).sort(
      (a, b) => (byCompany[b]?.length ?? 0) - (byCompany[a]?.length ?? 0)
    );
    return [...PINNED_COMPANIES, ...rest];
  }, [byCompany]);

  const withSignals = companies.filter((c) => (byCompany[c]?.length ?? 0) > 0);

  const searchedCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? companies.filter((c) => c.toLowerCase().includes(q)) : companies;
  }, [companies, search]);

  const displayedCompanies =
    selected !== 'all' ? companies.filter((c) => c === selected) : searchedCompanies;

  function selectCompany(company: string) {
    if (selected === company) {
      setSelected('all');
    } else {
      setSelected(company);
      setSearch('');
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    setSelected('all');
  }

  function handleDropdown(value: string) {
    setSelected(value);
    setSearch('');
  }

  return (
    <>
      {/* Sticky company tile bar */}
      <div
        style={{
          position: 'sticky',
          top: 56,
          zIndex: 50,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 8,
          }}
        >
          {companies.map((company) => {
            const count = byCompany[company]?.length ?? 0;
            const isActive = selected === company;
            const color = COMPANY_COLORS[company] ?? '#8b949e';
            return (
              <button
                key={company}
                onClick={() => selectCompany(company)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 8px',
                  borderRadius: 10,
                  border: isActive
                    ? `1px solid ${color}99`
                    : '1px solid var(--border)',
                  background: isActive ? `${color}18` : 'var(--bg-card)',
                  cursor: 'pointer',
                  opacity: count === 0 ? 0.45 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <CompanyLogo company={company} size={36} />
                  {count > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: -6,
                      right: -8,
                      background: isActive ? color : 'var(--bg-input)',
                      color: isActive ? 'var(--bg)' : 'var(--text-muted)',
                      border: `1px solid ${isActive ? color : 'var(--border)'}`,
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '0 4px',
                      lineHeight: '15px',
                      minWidth: 15,
                      textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 12,
                  color: isActive ? color : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {shortName(company)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="page-title">Companies</div>
        <div className="page-subtitle">
          Competitor profiles grouped by company · {withSignals.length} of {companies.length} with signals this cycle
        </div>

        {/* Search + dropdown row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
          <button
            onClick={() => { setSelected('all'); setSearch(''); }}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius)',
              border: selected === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: selected === 'all' ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: selected === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: selected === 'all' ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            All ({withSignals.length})
          </button>

          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <span style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: 13,
              pointerEvents: 'none',
            }}>
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search companies…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 28 }}
            />
          </div>

          <select
            value={selected}
            onChange={(e) => handleDropdown(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="all">All companies ({companies.length})</option>
            <optgroup label="With signals">
              {companies.filter((c) => (byCompany[c]?.length ?? 0) > 0).map((c) => (
                <option key={c} value={c}>
                  {c} ({byCompany[c]?.length ?? 0})
                </option>
              ))}
            </optgroup>
            <optgroup label="No signals yet">
              {companies.filter((c) => (byCompany[c]?.length ?? 0) === 0).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>

          {(selected !== 'all' || search) && (
            <button
              onClick={() => { setSelected('all'); setSearch(''); }}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Clear ✕
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {displayedCompanies.length} of {companies.length} shown
          </span>
        </div>

        {/* Company cards */}
        {displayedCompanies.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No companies match &ldquo;{search}&rdquo;
          </div>
        ) : (
          displayedCompanies.map((company) => {
            const signals = byCompany[company] ?? [];
            if (signals.length === 0) {
              return (
                <div
                  key={company}
                  className="card"
                  style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}
                >
                  <CompanyLogo company={company} size={18} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{company}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    — No signals ingested yet. Add a source URL to <code>config/sources.yaml</code> and re-run the pipeline.
                  </span>
                </div>
              );
            }
            return (
              <CompanySummary
                key={company}
                company={company}
                signals={signals}
              />
            );
          })
        )}
      </div>
    </>
  );
}
