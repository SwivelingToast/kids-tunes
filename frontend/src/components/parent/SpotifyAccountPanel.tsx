import { useEffect, useState } from 'react';
import { api, BASE_URL } from '../../api/client';
import { useParentUiStore } from '../../store/parentUiStore';
import type { ApiSpotifyStatus } from '../../api/types';
import styles from './SpotifyAccountPanel.module.css';

export default function SpotifyAccountPanel() {
  const [status, setStatus] = useState<ApiSpotifyStatus | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const flash = useParentUiStore((s) => s.flash);

  const load = async () => setStatus(await api.get<ApiSpotifyStatus>('/api/spotify/status'));

  useEffect(() => {
    load();
  }, []);

  const resync = async () => {
    setResyncing(true);
    try {
      const result = await api.post<{ addedCount: number; removedCount: number; playlistsSynced: number }>(
        '/api/spotify/resync',
      );
      flash(
        `Re-synced ${result.playlistsSynced} playlist${result.playlistsSynced === 1 ? '' : 's'} — ${result.addedCount} new, ${result.removedCount} removed`,
      );
      load();
    } finally {
      setResyncing(false);
    }
  };

  const disconnect = async () => {
    await api.post('/api/spotify/disconnect');
    flash('Spotify disconnected');
    load();
  };

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <span className={styles.avatar}>?</span>
          <div className={styles.identity}>
            <div className={styles.name}>Not connected</div>
            <span className="tag tag-neutral">Disconnected</span>
          </div>
        </div>
        <div className={styles.actions}>
          <a className="btn btn-primary" href={`${BASE_URL}/api/spotify/login`}>
            Connect Spotify
          </a>
        </div>
        <p className={styles.disconnectedNote}>
          This has to be done from a browser on the same machine that's running the jukebox server — see project
          notes on the OAuth redirect.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <span className={styles.avatar}>{status.displayName?.[0] ?? '?'}</span>
        <div className={styles.identity}>
          <div className={styles.name}>{status.displayName ?? 'Connected account'}</div>
          {status.email && <div className={styles.email}>{status.email}</div>}
        </div>
        <span className="tag tag-accent">Connected</span>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-primary" onClick={resync} disabled={resyncing}>
          {resyncing ? 'Re-syncing…' : 'Re-sync library'}
        </button>
        <button className="btn btn-secondary" onClick={disconnect}>
          Disconnect account
        </button>
      </div>
    </div>
  );
}
