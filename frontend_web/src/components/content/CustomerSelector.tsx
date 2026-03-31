import { useState } from 'react';
import type { DatasetRecordsResponse } from '@/api/datasets/types';

interface Props {
  data?: DatasetRecordsResponse;
  loading?: boolean;
  onSelect: (record: Record<string, any>) => void;
  selectedIndex?: number;
}

export function CustomerSelector({ data, loading, onSelect, selectedIndex }: Props) {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse h-64" />
    );
  }

  if (!data || data.records.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        データセットにレコードがありません
      </div>
    );
  }

  const columns = data.columns.slice(0, 6);
  const records = data.records;
  const startIdx = page * pageSize;
  const pageRecords = records.slice(startIdx, startIdx + pageSize);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">顧客選択</h3>
        <p className="text-xs text-muted-foreground">{data.total} 件中 {startIdx + 1}-{Math.min(startIdx + pageSize, data.total)} 件</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRecords.map((record, i) => {
              const globalIdx = startIdx + i;
              return (
                <tr
                  key={globalIdx}
                  onClick={() => onSelect(record)}
                  className={`border-b border-border cursor-pointer transition-colors hover:bg-primary/5 ${
                    selectedIndex === globalIdx ? 'bg-primary/10' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap">
                      {record[col] != null ? String(record[col]) : '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-40"
        >
          前へ
        </button>
        <span className="text-xs text-muted-foreground">Page {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={startIdx + pageSize >= data.total}
          className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-40"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
