import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import App from './App';
import PwaUpdateBanner from './components/PwaUpdateBanner';
import PreviewGate from './components/PreviewGate';
import { isAdminAuthenticated } from './services/adminApi';

const AdminScreen = lazy(() => import('./screens/AdminScreen'));

function parsePreviewDay(hash) {
  const match = hash.match(/^#\/preview\/(\d+)/);
  if (!match) return null;
  const day = Number(match[1]);
  if (Number.isNaN(day) || day < 0 || day > 31) return null;
  return day;
}

function AdminFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6a11cb" />
    </View>
  );
}

function Root() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewDayNumber, setPreviewDayNumber] = useState(null);
  const [previewBlocked, setPreviewBlocked] = useState(false);
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
      const adminRoute =
        !previewDay &&
        (hash.startsWith('#/admin') ||
          pathname === '/admin' ||
          pathname.endsWith('/admin') ||
          search === '?/admin');

      const blockedPreview = previewDay != null && !isAdminAuthenticated();
      setPreviewDayNumber(blockedPreview ? null : previewDay);
      setPreviewBlocked(blockedPreview);
      setIsAdmin(adminRoute);
    };

    const onPwaUpdate = () => setUpdateAvailable(true);

    normalizeAdminUrl();
    updateRoute();
    if (window.__PWA_UPDATE_AVAILABLE__) {
      setUpdateAvailable(true);
    }

    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('storage', updateRoute);
    window.addEventListener('pwa-update-available', onPwaUpdate);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('storage', updateRoute);
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

  function goToAdmin() {
    if (typeof window === 'undefined') return;
    window.location.hash = '#/admin';
  }

  const blockedDay = previewBlocked ? parsePreviewDay(window.location.hash) : null;

  return (
    <>
      <PwaUpdateBanner visible={updateAvailable} onReload={reloadApp} />
      {isAdmin ? (
        <Suspense fallback={<AdminFallback />}>
          <AdminScreen />
        </Suspense>
      ) : previewBlocked && blockedDay != null ? (
        <PreviewGate dayNumber={blockedDay} onGoAdmin={goToAdmin} />
      ) : (
        <App previewDayNumber={previewDayNumber} adminPreview={previewDayNumber != null} />
      )}
    </>
  );
}

export default Root;
