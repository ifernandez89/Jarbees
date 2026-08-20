"use client";
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // register the canonical `/sw.js` which now imports the workbox bundle
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // best-effort: if registration fails, silently ignore
      });
    }
  }, []);

  return null;
}
