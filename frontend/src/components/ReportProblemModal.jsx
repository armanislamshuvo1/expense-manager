import React, { useState, useEffect } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { AlertCircle, CheckCircle2, Clock, Send, X, MessageSquare, History } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ReportProblemModal({ isOpen, onClose }) {
  const axiosSecure = useAxiosSecure();
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [loading, setLoading] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'BUG',
    description: ''
  });

  const categories = [
    { value: 'BUG', label: '🐛 Bug / Crash' },
    { value: 'AI_FEATURE', label: '✨ AI Feature Issue' },
    { value: 'SYNC_ISSUE', label: '🔄 Sync & Data Conflict' },
    { value: 'ACCOUNT_BILLING', label: '💳 Account & Tier' },
    { value: 'OTHER', label: '💬 General Feedback / Other' }
  ];

  const fetchMyReports = async () => {
    setHistoryLoading(true);
    try {
      const res = await axiosSecure.get('/api/support/my-reports');
      if (res.data.success) {
        setMyReports(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchMyReports();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    setLoading(true);
    try {
      const res = await axiosSecure.post('/api/support/reports', form);
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Report Received!',
          text: 'Our team will review it. You can check status in My Tickets anytime.',
          timer: 2500,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        setForm({ title: '', category: 'BUG', description: '' });
        onClose();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: err.response?.data?.message || 'Could not send report. Please try again.',
        background: '#1e1e24',
        color: '#ffffff'
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-base-100 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl border border-base-content/10 relative max-h-[85vh] sm:max-h-[90vh] my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-error/10 text-error rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-base-content">Report an Issue</h2>
              <p className="text-[11px] text-base-content/50">Submit bugs or check ticket status</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-base-content/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 my-3 p-1 bg-base-200 rounded-2xl">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'new' ? 'bg-primary text-white shadow-sm' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> New Report
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <History className="w-3.5 h-3.5" /> My Tickets
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'new' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Category</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Subject / Title</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Receipt scanner crashed on PNG upload"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input input-bordered input-sm w-full text-xs"
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">What happened? (Details)</span>
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  placeholder="Please describe what you were doing, what went wrong, and any error message you saw..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="textarea textarea-bordered textarea-sm w-full text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-sm w-full rounded-xl gap-2 font-bold shadow-md"
              >
                {loading ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-4 h-4" />}
                Submit Report
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-8 text-base-content/50 text-xs">
                  No reports submitted yet.
                </div>
              ) : (
                myReports.map((report) => (
                  <div key={report._id} className="p-3 bg-base-200 rounded-2xl border border-base-content/5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs truncate">{report.title}</span>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-[11px] text-base-content/70 line-clamp-2">{report.description}</p>
                    {report.adminNotes && (
                      <div className="p-2 bg-base-300 rounded-xl text-[10px] text-primary">
                        <span className="font-bold">Admin note:</span> {report.adminNotes}
                      </div>
                    )}
                    <div className="text-[9px] text-base-content/40">
                      {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
