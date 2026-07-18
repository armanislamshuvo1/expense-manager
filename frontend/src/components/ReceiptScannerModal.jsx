import React, { useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Camera, Upload, AlertCircle, Check, Loader2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { queueOperation, generateUUID } from '../utils/syncManager';

export default function ReceiptScannerModal({ isOpen, onClose, onTransactionApproved }) {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/accounts');
      return res.data.success ? res.data.data : [];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/categories');
      return res.data.success ? res.data.data : [];
    }
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedResult, setParsedResult] = useState(null);

  // Client-Side Canvas-based Compression and EXIF Stripping
  const compressImageFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Standardize image sizes for faster OCR processing
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // toBlob naturally discards EXIF/metadata
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.80);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Security Check: Restrict to valid raster images
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and WEBP images are supported.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const compressed = await compressImageFile(file);
      setImage(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      setError('Image processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanReceipt = async () => {
    if (!image) {
      setError('Please upload or capture a receipt photo first.');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('receipt', image);

    try {
      const res = await axiosSecure.post('/api/ai/scan-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setParsedResult(res.data.data);
      } else {
        setError(res.data.message || 'Scanning failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error processing receipt on the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!parsedResult) return;
    setLoading(true);
    try {
      const matchedAccount = accounts.find(a => a._id === parsedResult.accountId);
      const matchedCategory = categories.find(c => c._id === parsedResult.categoryId);

      // Post transaction directly
      const payload = {
        accountId: parsedResult.accountId,
        categoryId: parsedResult.categoryId,
        type: parsedResult.type || 'EXPENSE',
        amount: parsedResult.amount,
        currency: 'MYR', // Default base currency
        date: parsedResult.date,
        description: parsedResult.description || 'Receipt Scan',
        note: parsedResult.note || '',
        accountName: matchedAccount ? matchedAccount.name : 'Account',
        categoryName: matchedCategory ? matchedCategory.name : 'Category'
      };

      const clientTxId = generateUUID();
      queueOperation('CREATE', clientTxId, null, payload);

      Swal.fire({
        icon: 'success',
        title: 'Transaction Logged',
        text: 'Receipt transaction added successfully!',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-3xl bg-base-100 text-base-content border border-base-content/10'
        }
      });
      queryClient.invalidateQueries(['transactions']);
      onClose();
      if (onTransactionApproved) onTransactionApproved();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.response?.data?.message || 'Could not log transaction.',
        customClass: {
          popup: 'rounded-3xl bg-base-100 text-base-content border border-base-content/10'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-error" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">AI Receipt Scanner</h3>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!parsedResult ? (
          <div className="space-y-6">
            {preview ? (
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-base-content/10 bg-base-200">
                <img src={preview} alt="Receipt preview" className="w-full h-full object-contain" />
                <button 
                  onClick={() => { setPreview(''); setImage(null); }}
                  className="absolute top-2 right-2 btn btn-xs btn-circle btn-error"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-base-content/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-base-200/50 hover:bg-base-200 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-base-content/40 mb-3" />
                <p className="text-xs font-bold text-base-content/85 mb-1">Click to Upload / Capture Photo</p>
                <p className="text-[10px] opacity-40">Supports JPG, PNG, WEBP</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-error bg-error/10 p-3 rounded-xl border border-error/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleScanReceipt}
              disabled={loading || !image}
              className="btn btn-error btn-block rounded-2xl text-white font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Scanning Receipt...
                </>
              ) : (
                'Start AI Extraction'
              )}
            </button>
          </div>
        ) : (
          /* Review & Confirm Mode */
          <div className="space-y-6">
            <div className="bg-success/10 border border-success/20 rounded-2xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2 text-success">
                <Check className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-success uppercase tracking-wider">AI Extraction Complete</h4>
              <p className="text-[10px] opacity-60 mt-0.5">Please review the details before saving.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-[10px] uppercase font-bold opacity-40">Amount (MYR)</label>
                  <input
                    type="number"
                    value={parsedResult.amount || ''}
                    onChange={(e) => setParsedResult({ ...parsedResult, amount: Number(e.target.value) })}
                    className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
                  />
                </div>
                <div className="form-control">
                  <label className="label text-[10px] uppercase font-bold opacity-40">Date</label>
                  <input
                    type="date"
                    value={parsedResult.date ? parsedResult.date.split('T')[0] : ''}
                    onChange={(e) => setParsedResult({ ...parsedResult, date: e.target.value })}
                    className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">Merchant / Note</label>
                <input
                  type="text"
                  value={parsedResult.note || ''}
                  onChange={(e) => setParsedResult({ ...parsedResult, note: e.target.value })}
                  maxLength={30}
                  className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
                />
              </div>

              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">Description / Details</label>
                <textarea
                  value={parsedResult.description || ''}
                  onChange={(e) => setParsedResult({ ...parsedResult, description: e.target.value })}
                  className="textarea textarea-bordered rounded-xl text-xs bg-base-200 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setParsedResult(null)}
                className="btn btn-ghost flex-1 rounded-2xl font-bold"
              >
                Rescan
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="btn btn-error flex-1 rounded-2xl text-white font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Transaction'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
