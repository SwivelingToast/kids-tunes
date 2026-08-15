import { useEffect } from 'react';

// Keeps the tablet's screen from timing out and going dark while the
// kiosk sits idle waiting for a kid to walk up. The browser releases a
// wake lock whenever the tab/page loses visibility, so it has to be
// re-acquired on visibilitychange - not just requested once on mount.
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Not fatal - the screen will just time out normally per whatever
        // the device's own display settings are (e.g. lock screen not
        // permitted, battery saver active). Nothing useful to surface here.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, []);
}
