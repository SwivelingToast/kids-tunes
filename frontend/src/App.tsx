import { useEffect } from 'react';
import KioskFrame from './components/KioskFrame';
import KidScreen from './components/kid/KidScreen';
import PinScreen from './components/PinScreen';
import ParentScreen from './components/parent/ParentScreen';
import { useKidStore } from './store/kidStore';
import { usePlaybackSDK } from './spotify/usePlaybackSDK';
import { useWakeLock } from './lib/useWakeLock';
import { api } from './api/client';
import type { ApiNowPlaying } from './api/types';

const NOW_PLAYING_POLL_MS = 2000;
const REMOTE_POSITION_TICK_MS = 500;

export default function App() {
  const view = useKidStore((s) => s.view);
  const isAdmin = useKidStore((s) => s.isAdmin);
  const bindPlaybackControls = useKidStore((s) => s.bindPlaybackControls);
  const syncPlaybackState = useKidStore((s) => s.syncPlaybackState);

  useWakeLock();

  // Lives here, not in KidScreen, specifically because KidScreen unmounts
  // on every switch to the pin/parent view (see the view switch below).
  // Spotify's SDK only ever fires its one-time "ready" callback once per
  // page load - if the player were created inside KidScreen, disconnecting
  // it on unmount and recreating it on remount would leave the second
  // instance stuck uninitialized forever, since nothing fires that
  // callback again. Owning it here keeps one player alive for the whole
  // session, so audio also keeps playing while a parent is in settings.
  //
  // Disabled entirely for /admin sessions (isAdmin) - a remote device only
  // there to administrate must never register as a Spotify Connect device,
  // or it could compete for/steal playback from the real kiosk.
  const sdk = usePlaybackSDK({ enabled: !isAdmin, onTrackEnd: () => useKidStore.getState().advance() });

  // Account-wide playback truth, polled only on the kiosk (not /admin
  // sessions - see kidStore's isAdmin). The kiosk's own SDK only reports
  // state for itself, so it goes stale/silent once playback has been cast
  // to a different Connect device - this corrects playingId/playing/pos
  // and activeDeviceId in that case (see applyNowPlayingPoll).
  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await api.get<ApiNowPlaying>('/api/spotify/now-playing');
        if (!cancelled) useKidStore.getState().applyNowPlayingPoll(data);
      } catch {
        // Transient network/API hiccups just wait for the next tick.
      }
    };
    poll();
    const interval = setInterval(poll, NOW_PLAYING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAdmin]);

  // Interpolates `pos` between now-playing poll ticks (2s apart) the same
  // way the local SDK hook already interpolates between its own events -
  // without this the progress bar only advances in visible jumps while
  // casting. A no-op whenever the kiosk itself is hosting playback (see
  // tickRemoteNowPlaying).
  useEffect(() => {
    if (isAdmin) return;
    const interval = setInterval(() => useKidStore.getState().tickRemoteNowPlaying(), REMOTE_POSITION_TICK_MS);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    bindPlaybackControls({
      playTrackUri: sdk.playTrackUri,
      pausePlayback: sdk.pausePlayback,
      resumePlayback: sdk.resumePlayback,
    });
  });

  useEffect(() => {
    syncPlaybackState({
      isPlaying: sdk.isPlaying,
      posSeconds: sdk.positionMs / 1000,
      ready: sdk.ready,
      reconnecting: sdk.reconnecting,
      error: sdk.error,
    });
  }, [sdk.isPlaying, sdk.positionMs, sdk.ready, sdk.reconnecting, sdk.error, syncPlaybackState]);

  return (
    <KioskFrame>
      {!isAdmin && view === 'kid' && <KidScreen />}
      {view === 'pin' && <PinScreen />}
      {view === 'parent' && <ParentScreen />}
    </KioskFrame>
  );
}
