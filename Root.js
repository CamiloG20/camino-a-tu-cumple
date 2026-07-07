import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import App from './App';
import AdminScreen from './screens/AdminScreen';
import PwaUpdateBanner from './components/PwaUpdateBanner';

function parsePreviewDay(hash) {
  const match = hash.match(/^#\/preview\/(\d+)/);
  if (!match) return null;
  const day = Number(match[1]);
  return Number.isNaN(day) ? null : day;
}

function Root() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewDayNumber, setPreviewDayNumber] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const normalizeAdminUrl = () => {
      const { hash, pathname, search } = window.location;
      const isAdminPath =
        hash.startsWith('#/admin') ||
        pathname === '/admin' ||
        pathname.endsWith('/admin') ||
        search === '?/admin';

      if (isAdminPath && !hash.startsWith('#/admin')) {
        window.history.replaceState(null, '', `${window.location.origin}/#/admin`);
      }
    };

    const updateRoute = () => {
      const { hash, pathname, search } = window.location;
      const previewDay = parsePreviewDay(hash);
      const isAdmin =
        !previewDay &&
        (hash.startsWith('#/admin') ||
          pathname === '/admin' ||
          pathname.endsWith('/admin') ||
          search === '?/admin');
      setPreviewDayNumber(previewDay);
      setIsAdmin(isAdmin);
    };

    const onPwaUpdate = () => setUpdateAvailable(true);

    normalizeAdminUrl();
    updateRoute();
    if (window.__PWA_UPDATE_AVAILABLE__) {
      setUpdateAvailable(true);
    }

    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('pwa-update-available', onPwaUpdate);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('pwa-update-available', onPwaUpdate);
    };
  }, []);

  function reloadApp() {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    window.location.reload();
  }

  return (
    <>
      <PwaUpdateBanner visible={updateAvailable} onReload={reloadApp} />
      {isAdmin ? (
        <AdminScreen />
      ) : (
        <App previewDayNumber={previewDayNumber} />
      )}
    </>
  );
}

export default Root;
