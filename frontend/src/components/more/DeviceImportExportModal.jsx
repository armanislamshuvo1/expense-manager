import React, { useState } from 'react';
import { Download, Upload, Shield, FileText, FileSpreadsheet, Lock, Calendar, Sparkles, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useAxiosSecure } from '../../hooks/useApi';

export default function DeviceImportExportModal({ isOpen, onClose, onTriggerConflictResolution, onImportSuccess }) {
  const axiosSecure = useAxiosSecure();
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'

  // Export States
  const [exportFormat, setExportFormat] = useState('json'); // 'json' | 'csv' | 'xlsx' | 'pdf'
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'ytd' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [exportPasscode, setExportPasscode] = useState('');
  const [exporting, setExporting] = useState(false);

  // Import States
  const [importFile, setImportFile] = useState(null);
  const [importPasscode, setImportPasscode] = useState('');
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    setErrorMessage('');
    try {
      let start = startDate;
      let end = endDate;
      const now = new Date();

      if (timeRange === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      } else if (timeRange === 'last_month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      } else if (timeRange === 'ytd') {
        start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
        end = now.toISOString().slice(0, 10);
      }

      let queryStr = `format=${exportFormat}`;
      if (start) queryStr += `&startDate=${start}`;
      if (end) queryStr += `&endDate=${end}`;
      if (encryptEnabled && exportPasscode.trim()) queryStr += `&passcode=${encodeURIComponent(exportPasscode.trim())}`;

      const response = await axiosSecure.get(`/api/sync/export?${queryStr}`, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extMap = { json: 'json', csv: 'csv', xlsx: 'xlsx', pdf: 'pdf' };
      link.setAttribute('download', `NexusWealth_Export_${new Date().toISOString().slice(0, 10)}.${extMap[exportFormat]}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Error:', err);
      let msg = 'Failed to generate export file.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) msg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setErrorMessage(msg);
    } finally {
      setExporting(false);
    }
  };

  const handleScanFile = async (fileObj, passcodeVal = '') => {
    setScanning(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      if (fileObj) formData.append('file', fileObj);
      if (passcodeVal) formData.append('passcode', passcodeVal);

      const response = await axiosSecure.post('/api/sync/import-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.isEncrypted) {
        setIsEncryptedFile(true);
        setScanning(false);
        return;
      }

      const { conflicts, summary, payload } = response.data;

      // Optional Gemini AI analysis
      if (payload && payload.transactions && payload.transactions.length > 0) {
        setAiAnalyzing(true);
        try {
          const sampleItems = payload.transactions.slice(0, 100);
          const aiRes = await axiosSecure.post('/api/sync/ai-analyze-import', { items: sampleItems });
          if (aiRes.data.success && aiRes.data.summary) {
            setAiSummary(aiRes.data.summary);
          }
        } catch (_) {}
        setAiAnalyzing(false);
      }

      onClose();
      onTriggerConflictResolution({ conflicts, summary, payload, aiSummary });
    } catch (err) {
      console.error('Scan Error:', err);
      setErrorMessage(err.response?.data?.message || 'Invalid or corrupted backup file format.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-300 w-full max-w-lg rounded-3xl border border-base-content/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-base-content/10 flex justify-between items-center bg-base-200">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-error" /> Device Data Import & Export
            </h2>
            <p className="text-xs text-base-content/50">Multi-format backups, financial reports & intelligent imports</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-content/10 bg-base-200/50">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'export' ? 'border-error text-error bg-base-300' : 'border-transparent text-base-content/60'
            }`}
          >
            <Download className="w-4 h-4" /> Export & Reports
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'import' ? 'border-error text-error bg-base-300' : 'border-transparent text-base-content/60'
            }`}
          >
            <Upload className="w-4 h-4" /> Import Backup
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="alert alert-error text-xs p-3 text-white rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'export' ? (
            <div className="space-y-5">
              {/* Format Selection Cards */}
              <div>
                <label className="text-xs font-bold uppercase text-base-content/60 mb-2 block">Choose Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      exportFormat === 'json' ? 'border-error bg-error/10 text-error font-bold' : 'border-base-content/10 hover:bg-base-200'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs block font-bold">JSON Backup</span>
                      <span className="text-[10px] opacity-70 block">Full system snapshot</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      exportFormat === 'xlsx' ? 'border-error bg-error/10 text-error font-bold' : 'border-base-content/10 hover:bg-base-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs block font-bold">Excel (.xlsx)</span>
                      <span className="text-[10px] opacity-70 block">Multi-sheet workbook</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      exportFormat === 'pdf' ? 'border-error bg-error/10 text-error font-bold' : 'border-base-content/10 hover:bg-base-200'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs block font-bold">PDF Financial Report</span>
                      <span className="text-[10px] opacity-70 block">Executive summary & charts</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      exportFormat === 'csv' ? 'border-error bg-error/10 text-error font-bold' : 'border-base-content/10 hover:bg-base-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs block font-bold">CSV File</span>
                      <span className="text-[10px] opacity-70 block">Standard spreadsheet</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date Filter Selection */}
              <div className="bg-base-200/50 p-4 rounded-2xl border border-base-content/10 space-y-3">
                <label className="text-xs font-bold uppercase text-base-content/60 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-error" /> Timeline Filter
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['all', 'this_month', 'last_month', 'ytd', 'custom'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeRange(t)}
                      className={`py-2 px-1 rounded-lg border capitalize text-[11px] font-medium transition-all ${
                        timeRange === t ? 'border-error bg-error text-white font-bold' : 'border-base-content/10 hover:bg-base-200'
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {timeRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="text-[10px] text-base-content/50 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input input-sm input-bordered w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-base-content/50 block mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input input-sm input-bordered w-full text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Encryption Toggle for JSON */}
              {exportFormat === 'json' && (
                <div className="bg-base-200/50 p-4 rounded-2xl border border-base-content/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-base-content/80 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-warning" /> Password Protect Backup (AES-256)
                    </span>
                    <input
                      type="checkbox"
                      checked={encryptEnabled}
                      onChange={(e) => setEncryptEnabled(e.target.checked)}
                      className="toggle toggle-error toggle-sm"
                    />
                  </div>

                  {encryptEnabled && (
                    <input
                      type="password"
                      placeholder="Enter encryption passcode..."
                      value={exportPasscode}
                      onChange={(e) => setExportPasscode(e.target.value)}
                      className="input input-sm input-bordered w-full text-xs"
                    />
                  )}
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn btn-error w-full text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {exporting ? <span className="loading loading-spinner loading-xs" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Generating Download...' : 'Generate & Download Export'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Dropzone */}
              <div>
                <label className="text-xs font-bold uppercase text-base-content/60 mb-2 block">Upload Backup File (.json, .csv, .xlsx, .mmbak)</label>
                <div className="border-2 border-dashed border-base-content/20 rounded-2xl p-6 text-center hover:border-error transition-colors cursor-pointer bg-base-200/30">
                  <input
                    type="file"
                    accept=".json,.csv,.xlsx,.mmbak"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setImportFile(file);
                        setIsEncryptedFile(false);
                        handleScanFile(file, importPasscode);
                      }
                    }}
                    className="hidden"
                    id="backup-file-input"
                  />
                  <label htmlFor="backup-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-error" />
                    <span className="text-xs font-medium text-base-content/80">
                      {importFile ? importFile.name : 'Click to select or drag & drop backup file'}
                    </span>
                    <span className="text-[10px] text-base-content/50">Supports ExpenseManager & Money Manager (.mmbak) files</span>
                  </label>
                </div>
              </div>

              {/* Password Prompt if Encrypted File */}
              {isEncryptedFile && (
                <div className="bg-warning/10 border border-warning/30 p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-warning flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> This backup is password-protected
                  </span>
                  <input
                    type="password"
                    placeholder="Enter decryption passcode..."
                    value={importPasscode}
                    onChange={(e) => setImportPasscode(e.target.value)}
                    className="input input-sm input-bordered w-full text-xs"
                  />
                  <button
                    onClick={() => handleScanFile(importFile, importPasscode)}
                    disabled={scanning}
                    className="btn btn-warning btn-sm w-full text-white font-bold rounded-xl"
                  >
                    Decrypt & Scan Backup
                  </button>
                </div>
              )}

              {(scanning || aiAnalyzing) && (
                <div className="flex flex-col items-center justify-center p-6 gap-2 text-xs text-base-content/70">
                  <span className="loading loading-spinner loading-md text-error" />
                  <span className="flex items-center gap-1 font-bold">
                    <Sparkles className="w-4 h-4 text-error" /> AI Analyzing & Scanning Backup...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
