import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const DISMISS_KEY = 'pwa-install-dismissed-v1';

function isIosStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    setIsStandalone(isIosStandalone());
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const canShowAndroid = Boolean(deferredPrompt) && !dismissed && !isStandalone;
  const canShowIos = isIosSafari() && !isStandalone && !dismissed && !deferredPrompt;

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, '1');
    }
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
    setShowIosHint(false);
  }, []);

  const openIosHint = useCallback(() => {
    setShowIosHint(true);
  }, []);

  return {
    canShowAndroid,
    canShowIos,
    showIosHint,
    install,
    dismiss,
    openIosHint,
    isStandalone,
  };
}
