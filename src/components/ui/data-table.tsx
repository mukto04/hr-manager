"use client";

import { ReactNode } from "react";
import { Card } from "./card";

export interface Column<T> {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = "No data found",
  rowClassName,
  noCard = false
}: {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: (row: T) => string | undefined;
  noCard?: boolean;
}) {
  const content = (
      <div className="overflow-x-auto w-full">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-5 py-10 text-center text-slate-500" colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"></div>
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length ? (
              data.map((row, index) => (
                <tr key={index} className={["border-t border-slate-100 align-top", rowClassName ? rowClassName(row) : ""].filter(Boolean).join(" ")}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-4 text-slate-700">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-10 text-center text-slate-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  );

  if (noCard) return content;

  return (
    <Card className="overflow-hidden">
      {content}
    </Card>
  );
}
