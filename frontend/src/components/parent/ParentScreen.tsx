import { useKidStore, type ParentTab } from '../../store/kidStore';
import SongsPanel from './SongsPanel';
import PlaylistsPanel from './PlaylistsPanel';
import QueuePanel from './QueuePanel';
import SpotifyAccountPanel from './SpotifyAccountPanel';
import KidsPanel from './KidsPanel';
import ChangePinPanel from './ChangePinPanel';
import ParentToast from './ParentToast';
import styles from './ParentScreen.module.css';

const TABS: { key: ParentTab; label: string }[] = [
  { key: 'songs', label: 'Songs' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'queue', label: 'Queue' },
  { key: 'spotify', label: 'Spotify Account' },
  { key: 'kids', label: 'Users' },
  { key: 'pin', label: 'Change PIN' },
];

export default function ParentScreen() {
  const parentTab = useKidStore((s) => s.parentTab);
  const setParentTab = useKidStore((s) => s.setParentTab);
  const exitParent = useKidStore((s) => s.exitParent);
  const isAdmin = useKidStore((s) => s.isAdmin);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerDivider} />
        <div>
          <div className={styles.headerKicker}>Parent controls</div>
          <div className={styles.headerTitle}>Jukebox settings</div>
        </div>
        <div className={styles.spacer} />
        <button
          className="btn btn-primary"
          onClick={exitParent}
          style={{ height: 48, padding: '0 20px', fontSize: 16, borderRadius: 'var(--radius-lg)' }}
        >
          {isAdmin ? 'Done — lock' : 'Done — back to kids'}
        </button>
      </div>

      <div className={styles.tabRow}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${parentTab === t.key ? styles.tabSelected : styles.tabUnselected}`}
            onClick={() => setParentTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {parentTab === 'songs' && <SongsPanel />}
        {parentTab === 'playlists' && <PlaylistsPanel />}
        {parentTab === 'queue' && <QueuePanel />}
        {parentTab === 'spotify' && <SpotifyAccountPanel />}
        {parentTab === 'kids' && <KidsPanel />}
        {parentTab === 'pin' && <ChangePinPanel />}
      </div>

      <ParentToast />
    </div>
  );
}
