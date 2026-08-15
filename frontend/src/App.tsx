import { useEffect } from 'react';
import KioskFrame from './components/KioskFrame';
import KidScreen from './components/kid/KidScreen';
import PinScreen from './components/PinScreen';
import ParentScreen from './components/parent/ParentScreen';
import { useKidStore } from './store/kidStore';
import { usePlaybackSDK } from './spotify/usePlaybackSDK';
import { useWakeLock } from './lib/useWakeLock';

export default function App() {
  const view = useKidStore((s) => s.view);
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
  const sdk = usePlaybackSDK({ onTrackEnd: () => useKidStore.getState().advance() });

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
      {view === 'kid' && <KidScreen />}
      {view === 'pin' && <PinScreen />}
      {view === 'parent' && <ParentScreen />}
    </KioskFrame>
  );
}
