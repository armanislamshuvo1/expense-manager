import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Terminal 
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminLogsTab({ 
  logs = [], 
  loading, 
  onResolveLog, 
  onPurgeResolved, 
  levelFilter, 
  setLevelFilter, 
  resolvedFilter, 
  setResolvedFilter, 
  onRefresh 
}) {
  const [expandedLogId, setExpandedLogId] = useState(null);
  const safeLogs = Array.isArray(logs) ? logs : [];

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handlePurge = async () => {
    const result = await Swal.fire({
      title: 'Purge Resolved Logs?',
      text: 'This will permanently delete all logs marked as resolved.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Purge',
      confirmButtonColor: '#ef4444',
      background: '#1e1e24',
      color: '#ffffff'
    });

    if (result.isConfirmed) {
      await onPurgeResolved();
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="card bg-base-100 shadow-md border border-base-content/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="select select-bordered select-xs font-semibold"
            >
              <option value="">All Levels</option>
              <option value="error">Error Only</option>
              <option value="warn">Warn Only</option>
              <option value="info">Info Only</option>
            </select>

            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="select select-bordered select-xs font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="false">Unresolved Only</option>
              <option value="true">Resolved Only</option>
            </select>

            <button onClick={onRefresh} className="btn btn-ghost btn-xs btn-square" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-base-content/60" />
            </button>
          </div>

          <button
            onClick={handlePurge}
            className="btn btn-error btn-outline btn-xs rounded-lg gap-1.5 font-bold"
          >
            <Trash2 className="w-3 h-3" /> Purge Resolved Logs
          </button>
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="card bg-base-100 shadow-md border border-base-content/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : safeLogs.length === 0 ? (
          <div className="p-12 text-center text-base-content/50 text-xs">
            No system error logs found.
          </div>
        ) : (
          <div className="divide-y divide-base-content/10">
            {safeLogs.map((log) => {
              const isExpanded = expandedLogId === log._id;
              return (
                <div key={log._id} className="p-4 hover:bg-base-200/40 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge badge-sm text-[10px] font-bold ${
                        log.level === 'error' ? 'badge-error' : log.level === 'warn' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      {log.statusCode && (
                        <span className="badge badge-ghost badge-sm text-[10px] font-mono">
                          {log.statusCode}
                        </span>
                      )}
                      {log.method && (
                        <span className="text-[11px] font-bold font-mono text-primary">
                          {log.method}
                        </span>
                      )}
                      <span className="text-xs font-mono text-base-content/70">
                        {log.path || 'System Event'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-base-content/40">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {log.resolved ? (
                        <span className="badge badge-success text-[10px] text-white font-bold gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => onResolveLog(log._id)}
                          className="btn btn-success btn-xs text-white rounded-lg gap-1 font-bold"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(log._id)}
                        className="btn btn-ghost btn-xs btn-square"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="text-xs font-semibold text-base-content/90 font-mono">
                    {log.message}
                  </div>

                  {/* Stack trace drawer */}
                  {isExpanded && (
                    <div className="p-3 bg-neutral text-neutral-content rounded-xl text-[11px] font-mono overflow-x-auto mt-2 space-y-2">
                      <div className="flex items-center gap-1.5 text-warning font-bold">
                        <Terminal className="w-3.5 h-3.5" /> Stack Trace / Meta:
                      </div>
                      <pre className="whitespace-pre-wrap">{log.stack || 'No stack trace captured.'}</pre>
                      {log.meta && (
                        <div className="pt-2 border-t border-neutral-content/20 text-neutral-content/70">
                          {JSON.stringify(log.meta, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
