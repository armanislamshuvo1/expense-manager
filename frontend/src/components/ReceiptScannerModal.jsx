import React, { useState, useRef, useEffect } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Camera, Upload, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import { queueOperation, generateUUID } from '../utils/syncManager';
import { ReceiptCameraView } from './receipt/ReceiptCameraView';
import { ReceiptReviewForm } from './receipt/ReceiptReviewForm';

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
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('receiptActiveTab') || 'upload';
  });
  const [stream, setStream] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      sessionStorage.setItem('receiptActiveTab', activeTab);
    }
  }, [activeTab, isOpen]);

  const videoRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const triggerNativeCamera = () => {
    sessionStorage.setItem('receiptModalOpen', 'true');
    sessionStorage.setItem('receiptActiveTab', activeTab);
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      setError('Could not access the camera. Please check permissions or try uploading a file.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to capture photo.');
        return;
      }
      const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      
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
    }, 'image/jpeg', 0.85);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
    setIsDragging(false);
    dragCounterRef.current = 0;
    sessionStorage.removeItem('receiptModalOpen');
    sessionStorage.removeItem('receiptActiveTab');
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
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
    }
  };

  useEffect(() => {
    if (activeTab === 'camera' && isOpen && !preview) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen, preview]);

  const compressImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
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
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Image compression failed.'));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.75);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image.'));
      };
      img.src = objectUrl;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
      const matchedToAccount = accounts.find(a => a._id === parsedResult.toAccountId);
      const payload = {
        accountId: parsedResult.accountId,
        toAccountId: parsedResult.toAccountId,
        categoryId: parsedResult.categoryId,
        type: parsedResult.type || 'EXPENSE',
        amount: parsedResult.amount,
        currency: 'MYR',
        date: parsedResult.date ? new Date(parsedResult.date) : new Date(),
        description: parsedResult.description || 'Receipt Scan',
        note: parsedResult.note || '',
        accountName: matchedAccount ? matchedAccount.name : 'Account',
        toAccountName: matchedToAccount ? matchedToAccount.name : 'Account',
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
        customClass: { popup: 'rounded-3xl bg-base-100 text-base-content border border-base-content/10' }
      });
      queryClient.invalidateQueries(['transactions']);
      handleClose();
      if (onTransactionApproved) onTransactionApproved();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.response?.data?.message || 'Could not log transaction.',
        customClass: { popup: 'rounded-3xl bg-base-100 text-base-content border border-base-content/10' }
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl transition-all duration-300">
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-error" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">AI Receipt Scanner</h3>
          </div>
          <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!parsedResult ? (
          <div className="space-y-6">
            {!preview && (
              <div className="flex bg-base-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setActiveTab('upload'); stopCamera(); }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'upload' ? 'bg-base-100 shadow text-error' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'camera' ? 'bg-base-100 shadow text-error' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
            )}

            {preview ? (
              <div className="relative aspect-[3/4] md:aspect-[4/3] w-full rounded-2xl overflow-hidden border border-base-content/10 bg-base-200">
                <img src={preview} alt="Receipt preview" className="w-full h-full object-contain" />
                <button 
                  onClick={() => { setPreview(''); setImage(null); setError(''); }}
                  className="absolute top-2 right-2 btn btn-xs btn-circle btn-error z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : activeTab === 'camera' ? (
              <ReceiptCameraView
                stream={stream}
                videoRef={videoRef}
                triggerNativeCamera={triggerNativeCamera}
                capturePhoto={capturePhoto}
                startCamera={startCamera}
              />
            ) : (
              <div 
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer relative ${
                  isDragging
                    ? 'border-error bg-error/15 scale-[1.02] shadow-xl ring-4 ring-error/20'
                    : 'border-base-content/20 bg-base-200/50 hover:bg-base-200 hover:border-error/40'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer animate-none z-10"
                />
                <Upload className={`w-8 h-8 mb-3 transition-transform duration-300 ${isDragging ? 'text-error scale-125 animate-bounce' : 'text-base-content/40'}`} />
                <p className={`text-xs font-bold mb-1 transition-colors ${isDragging ? 'text-error font-black' : 'text-base-content/85'}`}>
                  {isDragging ? 'Drop Receipt Image Here!' : 'Click to Upload / Drag & Drop Photo'}
                </p>
                <p className="text-[10px] opacity-40 mb-4">
                  {isDragging ? 'Release to select this file' : 'Supports JPG, PNG, WEBP'}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); triggerNativeCamera(); }}
                  className="btn btn-xs btn-outline btn-error rounded-xl font-bold relative z-20"
                >
                  Use System Camera
                </button>
              </div>
            )}

            {error && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-error bg-error/10 p-3.5 rounded-xl border border-error/20">
                <div className="flex items-center gap-2 flex-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                {image && (
                  <button
                    type="button"
                    onClick={handleScanReceipt}
                    disabled={loading}
                    className="btn btn-xs btn-error text-white font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Retry Extraction
                  </button>
                )}
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
              ) : error && image ? (
                <>
                  <RefreshCw className="w-4 h-4" /> Retry AI Extraction
                </>
              ) : (
                'Start AI Extraction'
              )}
            </button>
          </div>
        ) : (
          <ReceiptReviewForm
            parsedResult={parsedResult}
            setParsedResult={setParsedResult}
            loading={loading}
            handleApprove={handleApprove}
          />
        )}
      </div>
    </div>
  );
}
