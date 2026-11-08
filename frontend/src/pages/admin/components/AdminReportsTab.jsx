import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  RefreshCw 
} from 'lucide-react';

export default function AdminReportsTab({ 
  reports = [], 
  loading, 
  onUpdateStatus, 
  statusFilter, 
  setStatusFilter, 
  categoryFilter, 
  setCategoryFilter, 
  onRefresh 
}) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const safeReports = Array.isArray(reports) ? reports : [];

  const openStatusModal = (report, targetStatus) => {
    setSelectedReport({ ...report, targetStatus });
    setNoteText(report.adminNotes || '');
  };

  const handleSaveStatus = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await onUpdateStatus(selectedReport._id, selectedReport.targetStatus, noteText);
      setSelectedReport(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SOLVED':
        return <span className="badge badge-success text-[10px] gap-1 font-bold text-white"><CheckCircle2 className="w-3 h-3" /> Solved</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-warning text-[10px] gap-1 font-bold"><Clock className="w-3 h-3" /> In Progress</span>;
      default:
        return <span className="badge badge-info text-[10px] gap-1 font-bold"><Clock className="w-3 h-3" /> Received</span>;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'AI_FEATURE': return '✨ AI Feature';
      case 'SYNC_ISSUE': return '🔄 Sync Issue';
      case 'ACCOUNT_BILLING': return '💳 Account / Tier';
      case 'OTHER': return '💬 General';
      default: return '🐛 Bug / Crash';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="card bg-base-100 shadow-md border border-base-content/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-base-content/60">Status:</span>
            {['', 'RECEIVED', 'IN_PROGRESS', 'SOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn btn-xs rounded-xl font-bold ${
                  statusFilter === st ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {st === '' ? 'All Reports' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="select select-bordered select-xs font-semibold"
            >
              <option value="">All Categories</option>
              <option value="BUG">Bug / Crash</option>
              <option value="AI_FEATURE">AI Feature</option>
              <option value="SYNC_ISSUE">Sync Issue</option>
              <option value="ACCOUNT_BILLING">Account / Tier</option>
              <option value="OTHER">Other</option>
            </select>
            <button onClick={onRefresh} className="btn btn-ghost btn-xs btn-square" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-base-content/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="card bg-base-100 p-12 text-center shadow-md">
            <span className="loading loading-spinner loading-md text-primary mx-auto" />
          </div>
        ) : safeReports.length === 0 ? (
          <div className="card bg-base-100 p-12 text-center text-base-content/50 text-xs shadow-md">
            No problem reports match the selected filter.
          </div>
        ) : (
          safeReports.map((report) => (
            <div key={report._id} className="card bg-base-100 shadow-md border border-base-content/10 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base-content/10 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(report.status)}
                  <span className="badge badge-ghost text-[10px] font-semibold">
                    {getCategoryLabel(report.category)}
                  </span>
                  <span className="text-xs text-base-content/50">
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>
                
                {/* User info */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold">{report.userId?.name || 'Anonymous User'}</span>
                  <span className="text-base-content/50">({report.userId?.email || 'N/A'})</span>
                  {report.userId?.tier && (
                    <span className="badge badge-outline badge-xs font-bold text-[9px]">
                      {report.userId.tier}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="font-bold text-sm text-base-content">{report.title}</h4>
                <p className="text-xs text-base-content/70 mt-1 whitespace-pre-wrap">{report.description}</p>
              </div>

              {/* Existing Admin Notes */}
              {report.adminNotes && (
                <div className="p-3 bg-base-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5 text-[11px]">
                    <MessageSquare className="w-3.5 h-3.5" /> Resolution / Admin Notes:
                  </div>
                  <p className="text-base-content/80 text-[11px]">{report.adminNotes}</p>
                  {report.resolvedAt && (
                    <div className="text-[10px] text-base-content/40">
                      Resolved: {new Date(report.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {report.status !== 'IN_PROGRESS' && (
                  <button
                    onClick={() => openStatusModal(report, 'IN_PROGRESS')}
                    className="btn btn-warning btn-xs rounded-lg font-bold gap-1"
                  >
                    <Clock className="w-3 h-3" /> Mark In Progress
                  </button>
                )}
                {report.status !== 'SOLVED' && (
                  <button
                    onClick={() => openStatusModal(report, 'SOLVED')}
                    className="btn btn-success btn-xs rounded-lg text-white font-bold gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark Solved
                  </button>
                )}
                {report.status !== 'RECEIVED' && (
                  <button
                    onClick={() => openStatusModal(report, 'RECEIVED')}
                    className="btn btn-ghost btn-xs rounded-lg text-base-content/60"
                  >
                    Reset to Received
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Update & Note Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-base-100 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl border border-base-content/10 space-y-4 max-h-[85vh] sm:max-h-[90vh] my-auto overflow-y-auto">
            <h3 className="font-bold text-sm">
              Update Report to <span className="text-primary">{selectedReport.targetStatus}</span>
            </h3>
            <p className="text-xs text-base-content/60">
              Add optional resolution notes. The user will be able to see this message in their support tickets.
            </p>

            <textarea
              className="textarea textarea-bordered textarea-sm w-full text-xs font-sans"
              rows={4}
              placeholder="e.g. Fixed in release v3.0.6. Image parser timeout increased."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setSelectedReport(null)} 
                className="btn btn-ghost btn-sm text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveStatus} 
                disabled={actionLoading}
                className="btn btn-primary btn-sm text-xs font-bold"
              >
                {actionLoading ? <span className="loading loading-spinner loading-xs" /> : 'Confirm Status Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
