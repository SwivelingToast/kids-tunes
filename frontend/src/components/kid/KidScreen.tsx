import { useEffect } from 'react';
import { useKidStore } from '../../store/kidStore';
import NowPlayingBar from './NowPlayingBar';
import TabRow from './TabRow';
import BrowseGrid from './BrowseGrid';
import FavoritesModal from './FavoritesModal';
import Toast from './Toast';
import HiddenCornerTrigger from './HiddenCornerTrigger';
import styles from './KidScreen.module.css';

export default function KidScreen() {
  const showFav = useKidStore((s) => s.showFav);
  const loading = useKidStore((s) => s.loading);
  const loadError = useKidStore((s) => s.loadError);
  const songCount = useKidStore((s) => s.songs.length);
  const loadAll = useKidStore((s) => s.loadAll);

  useEffect(() => {
    loadAll();
    // Re-mounts every time the app returns to the kid view (see App.tsx's
    // view switch), so this also refreshes the library after parent edits.
    // The Spotify player itself lives in App.tsx, not here - it must
    // survive this remount (see the comment there for why).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className={styles.screen} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 19, color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>Loading...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.screen} style={{ alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center' }}>
        <p style={{ fontSize: 19, color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
          Could not reach the jukebox server. Is the backend running?
        </p>
      </div>
    );
  }

  if (songCount === 0) {
    return (
      <div className={styles.screen} style={{ alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center' }}>
        <p style={{ fontSize: 19, color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
          No songs in the jukebox yet. Add some from the parent Songs tab.
        </p>
        <HiddenCornerTrigger />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <NowPlayingBar />
      <TabRow />
      <BrowseGrid />
      <Toast />
      {showFav && <FavoritesModal />}
      <HiddenCornerTrigger />
    </div>
  );
}
