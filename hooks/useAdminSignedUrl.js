import { useEffect, useState } from 'react';
import { AdminApi } from '../services/adminApi';

export function useAdminSignedUrl(path) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let active = true;

    if (!path) {
      setUrl(null);
      return undefined;
    }

    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return undefined;
    }

    AdminApi.signMediaUrl(path)
      .then((signed) => {
        if (active) setUrl(signed);
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function useAdminSignedUrls(paths = []) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    let active = true;
    const list = Array.isArray(paths) ? paths.filter(Boolean) : [];

    if (!list.length) {
      setUrls([]);
      return undefined;
    }

    Promise.all(
      list.map((path) => {
        if (/^https?:\/\//i.test(path)) return Promise.resolve(path);
        return AdminApi.signMediaUrl(path).catch(() => null);
      })
    ).then((resolved) => {
      if (active) setUrls(resolved.filter(Boolean));
    });

    return () => {
      active = false;
    };
  }, [JSON.stringify(paths)]);

  return urls;
}
