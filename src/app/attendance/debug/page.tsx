"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function AdmsDebugPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attendance/adms/debug");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ADMS Hardware Debug Logs</h1>
        <Button onClick={fetchLogs} disabled={loading}>Refresh Logs</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4">Time</th>
              <th className="p-4">Path</th>
              <th className="p-4">Method</th>
              <th className="p-4">Table</th>
              <th className="p-4">Raw Body</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No logs captured yet. Punch on the machine to generate logs.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 whitespace-nowrap">{format(new Date(log.createdAt), "HH:mm:ss dd MMM")}</td>
                  <td className="p-4">{log.sn || "-"}</td>
                  <td className="p-4 text-xs max-w-[200px] truncate" title={log.path}>{log.path || "-"}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{log.method}</span></td>
                  <td className="p-4">{log.table || "-"}</td>
                  <td className="p-4 font-mono text-[10px] max-w-xl truncate" title={log.body}>{log.body || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
