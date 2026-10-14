import React from 'react';

export const Table = ({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  loading = false,
  emptyMessage = 'No records found.',
  emptyTitle,
  className = '',
  onRowClick,
}) => {
  const isTableLoading = isLoading || loading;

  if (isTableLoading) {
    return (
      <div
        className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs ${className}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                {columns.map((col, idx) => (
                  <th key={col.key || idx} className="py-3 px-4">
                    {col.header || col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...Array(5)].map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={`bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center mb-2">
          📋
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {emptyTitle || emptyMessage}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          No records are available to display right now.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`py-3 px-4 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header || col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, rowIdx) => (
              <tr
                key={row[keyField] ?? rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors hover:bg-slate-50/70 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col, colIdx) => {
                  const val = col.key ? row[col.key] : undefined;
                  let cellContent = val;
                  if (col.render) {
                    cellContent = col.render(val, row, rowIdx);
                  }

                  // Safeguard: if cellContent is an unrenderable plain object (not a React element), stringify safely
                  if (
                    cellContent !== null &&
                    typeof cellContent === 'object' &&
                    !React.isValidElement(cellContent) &&
                    !Array.isArray(cellContent)
                  ) {
                    cellContent = cellContent?.name || cellContent?.code || cellContent?.id || JSON.stringify(cellContent);
                  }

                  return (
                    <td
                      key={col.key || colIdx}
                      className={`py-3.5 px-4 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
