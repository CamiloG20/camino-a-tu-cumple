import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import App from './App';
import AdminScreen from './screens/AdminScreen';
import PreviewGate from './components/PreviewGate';
import { isAdminAuthenticated } from './services/adminApi';

function parsePreviewDay(hash) {
  const match = hash.match(/^#\/preview\/(\d+)/);
  if (!match) return null;
  const day = Number(match[1]);
  if (Number.isNaN(day) || day < 0 || day > 31) return null;
  return day;
}

function Root() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewDayNumber, setPreviewDayNumber] = useState(null);
  const [previewBlocked, setPreviewBlocked] = useState(false);

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

    normalizeAdminUrl();
    updateRoute();

    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('storage', updateRoute);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('storage', updateRoute);
    };
  }, []);

  function goToAdmin() {
    if (typeof window === 'undefined') return;
    window.location.hash = '#/admin';
  }

  const blockedDay = previewBlocked ? parsePreviewDay(window.location.hash) : null;

  return (
    <>
      {isAdmin ? (
        <AdminScreen />
      ) : previewBlocked && blockedDay != null ? (
        <PreviewGate dayNumber={blockedDay} onGoAdmin={goToAdmin} />
      ) : (
        <App previewDayNumber={previewDayNumber} adminPreview={previewDayNumber != null} />
      )}
    </>
  );
}

export default Root;
