import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import Swal from 'sweetalert2';
import { useTheme } from '../context/ThemeContext';
import { hapticTap } from '../utils/haptics';

const SECONDARY_TABS = new Set(['/transactions', '/accounts', '/more']);
const ROOT_PATHS = new Set(['/dashboard', '/', '/login']);

export default function NativeMobileController() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const lastBackPressRef = useRef(0);
  const [showExitToast, setShowExitToast] = useState(false);

  // 1. Sync Android Status Bar & Meta Theme Color with active theme
  useEffect(() => {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#15191e' : '#f2f2f2';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', bgColor);
    }

    if (!Capacitor.isNativePlatform()) return;

    try {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      StatusBar.setBackgroundColor({ color: bgColor });
      StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('Native StatusBar sync skipped:', err);
    }
  }, [theme]);

  // 2. Mobile Keyboard & Hardware Back Button Engine
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    } catch (err) {
      console.warn('Native Keyboard initialization skipped:', err);
    }

    const backListenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      // Priority 1: Dismiss SweetAlert2 popup if open
      if (Swal.isVisible()) {
        hapticTap();
        Swal.close();
        return;
      }

      // Priority 2: Dismiss any open native HTML <dialog> modal
      const openModal = document.querySelector('dialog[open]');
      if (openModal) {
        hapticTap();
        openModal.close();
        return;
      }

      const currentPath = window.location.pathname;

      // Priority 3: Secondary bottom tabs return directly to Dashboard instead of replaying tab history
      if (SECONDARY_TABS.has(currentPath)) {
        hapticTap();
        navigate('/dashboard', { replace: true });
        return;
      }

      // Priority 4: Root screens require double-press within 2s to exit app
      if (ROOT_PATHS.has(currentPath) || !canGoBack) {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          hapticTap();
          setShowExitToast(true);
          setTimeout(() => setShowExitToast(false), 2000);
        }
        return;
      }

      // Priority 5: Sub-pages (e.g., /profile, /settings/*, /wealth-buddy) pop back normally
      hapticTap();
      navigate(-1);
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [navigate]);

  if (!showExitToast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none animate-fade-in">
      <div className="bg-neutral text-neutral-content px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-base-content/10 whitespace-nowrap">
        Press back again to exit
      </div>
    </div>
  );
}
