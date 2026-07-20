import React from 'react';
import { Camera } from 'lucide-react';

export function ReceiptCameraView({
  stream,
  videoRef,
  triggerNativeCamera,
  capturePhoto,
  startCamera
}) {
  return (
    <div className="relative aspect-[3/4] md:aspect-[4/3] w-full rounded-2xl overflow-hidden border border-base-content/10 bg-base-200 flex flex-col items-center justify-center">
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={triggerNativeCamera}
            className="absolute top-4 right-4 btn btn-xs bg-black/60 hover:bg-black text-white border-none rounded-xl flex items-center gap-1 z-10 font-bold"
          >
            <Camera className="w-3.5 h-3.5" />
            Use System Camera
          </button>
          <button
            type="button"
            onClick={capturePhoto}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-circle btn-error border-2 border-white shadow-lg w-12 h-12 flex items-center justify-center z-10"
          >
            <div className="w-4 h-4 bg-white rounded-full" />
          </button>
        </>
      ) : (
        <div className="text-center p-6 space-y-3">
          <Camera className="w-8 h-8 mx-auto text-base-content/40" />
          <p className="text-xs opacity-60">Camera stream loading or permission needed</p>
          <div className="flex flex-col gap-2 items-center justify-center">
            <button
              type="button"
              onClick={startCamera}
              className="btn btn-xs btn-error text-white rounded-xl font-bold"
            >
              Retry Camera
            </button>
            <button
              type="button"
              onClick={triggerNativeCamera}
              className="btn btn-xs btn-outline btn-error rounded-xl font-bold"
            >
              Use System Camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
