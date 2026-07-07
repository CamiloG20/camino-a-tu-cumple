import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import App from './App';
import AdminScreen from './screens/AdminScreen';

function Root() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const updateRoute = () => {
      setIsAdmin(window.location.hash.startsWith('#/admin'));
    };

    updateRoute();
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  if (isAdmin) {
    return <AdminScreen />;
  }

  return <App />;
}

export default Root;
