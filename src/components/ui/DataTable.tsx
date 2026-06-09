'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  rowKey: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  exportFilename?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const tableContainerStyle: React.CSSProperties = {
  background: 'rgba(10, 15, 30, 0.5)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '14px',
  overflow: 'hidden',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem 1.25rem',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const searchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.875rem',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  flex: '1 1 260px',
  maxWidth: '360px',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'white',
  fontSize: '0.85rem',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'rgba(160,160,200,0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  color: 'rgba(220,220,240,0.9)',
  whiteSpace: 'nowrap',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1.25rem',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  fontSize: '0.8rem',
  color: 'rgba(160,160,200,0.6)',
};

const selectStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
  fontSize: '0.8rem',
  outline: 'none',
  cursor: 'pointer',
};

const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '0.35rem 0.5rem',
  borderRadius: '8px',
  background: disabled ? 'transparent' : 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: disabled ? 'rgba(100,100,140,0.4)' : 'rgba(200,200,220,0.8)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
});

const exportBtnStyle: React.CSSProperties = {
  padding: '0.45rem 0.875rem',
  borderRadius: '10px',
  background: 'rgba(0, 212, 255, 0.12)',
  border: '1px solid rgba(0, 212, 255, 0.2)',
  color: 'rgb(0, 212, 255)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  transition: 'all 0.2s',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Cari...',
  searchKeys = [],
  rowKey,
  onRowClick,
  actions,
  emptyMessage = 'Tidak ada data.',
  exportFilename = 'export',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filtering
  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  // Sorting
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const aVal = col?.exportValue ? col.exportValue(a) : (a as any)[sortKey];
      const bVal = col?.exportValue ? col.exportValue(b) : (b as any)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'id', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePageIndex = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleExportCSV = () => {
    const allCols = actions ? columns : columns;
    const header = allCols.map((c) => c.label).join(',');
    const rows = sorted.map((row) =>
      allCols
        .map((col) => {
          const val = col.exportValue ? col.exportValue(row) : (row as any)[col.key];
          const str = val == null ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey]);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div style={tableContainerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={searchBoxStyle}>
          <Search size={16} style={{ color: 'rgba(160,160,200,0.5)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={searchInputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(160,160,200,0.5)' }}>
            {sorted.length} data
          </span>
          <button onClick={handleExportCSV} style={exportBtnStyle} title="Export CSV">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ ...thStyle, width: col.width, cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </div>
                </th>
              ))}
              {actions && <th style={thStyle}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{ ...tdStyle, textAlign: 'center', padding: '3rem 1rem', color: 'rgba(160,160,200,0.4)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr
                  key={getRowKey(row)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: onRowClick ? 'pointer' : undefined }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={tdStyle}>
                      {col.render ? col.render(row) : (row as any)[col.key] ?? '–'}
                    </td>
                  ))}
                  {actions && <td style={tdStyle}>{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div style={footerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Tampilkan</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} style={selectStyle}>
            {[5, 10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>per halaman</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>
            {sorted.length === 0 ? '0' : `${safePageIndex * pageSize + 1}–${Math.min((safePageIndex + 1) * pageSize, sorted.length)}`} dari {sorted.length}
          </span>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePageIndex === 0} style={pageBtnStyle(safePageIndex === 0)}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePageIndex >= totalPages - 1} style={pageBtnStyle(safePageIndex >= totalPages - 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
