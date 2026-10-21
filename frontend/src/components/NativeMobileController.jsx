import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

export default function NativeMobileController() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Android Status Bar styling (dark background, light icons)
    try {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#121214' });
      StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('Native StatusBar initialization skipped:', err);
    }

    // 2. Mobile Keyboard configuration (resizes viewport naturally)
    try {
      Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    } catch (err) {
      console.warn('Native Keyboard initialization skipped:', err);
    }

    // 3. Android Hardware Back Button Handler
    const backListenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      // If any modal/dialog is open, close it
      const openModal = document.querySelector('dialog[open]');
      if (openModal) {
        openModal.close();
        return;
      }

      // Exit app if already at root or landing/login
      const currentPath = window.location.pathname;
      if (currentPath === '/dashboard' || currentPath === '/' || currentPath === '/login' || !canGoBack) {
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [navigate]);

  return null;
}
