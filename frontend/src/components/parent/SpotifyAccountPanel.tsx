import { useEffect, useState } from 'react';
import { api, BASE_URL } from '../../api/client';
import { useParentUiStore } from '../../store/parentUiStore';
import type { ApiSpotifyDevice, ApiSpotifyStatus } from '../../api/types';
import styles from './SpotifyAccountPanel.module.css';

export default function SpotifyAccountPanel() {
  const [status, setStatus] = useState<ApiSpotifyStatus | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [devices, setDevices] = useState<ApiSpotifyDevice[] | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const flash = useParentUiStore((s) => s.flash);

  const load = async () => setStatus(await api.get<ApiSpotifyStatus>('/api/spotify/status'));

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      setDevices(await api.get<ApiSpotifyDevice[]>('/api/spotify/devices'));
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (status?.connected) loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  const transfer = async (deviceId: string) => {
    setTransferringId(deviceId);
    try {
      await api.post('/api/spotify/devices/transfer', { deviceId });
      await loadDevices();
    } catch {
      flash('Could not switch device - try again');
    } finally {
      setTransferringId(null);
    }
  };

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

      <div className={styles.deviceSection}>
        <div className={styles.deviceHeader}>
          <span className={styles.sectionTitle}>Playback device</span>
          <button className="btn btn-secondary" onClick={loadDevices} disabled={devicesLoading}>
            {devicesLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {devices === null ? (
          <p className={styles.deviceHint}>Loading devices…</p>
        ) : devices.length === 0 ? (
          <p className={styles.deviceHint}>
            No Spotify Connect devices found. Make sure the kiosk is open, or that a speaker's Spotify Connect is on.
          </p>
        ) : (
          <div className={styles.deviceRows}>
            {devices.map((d) => (
              <button
                key={d.id ?? d.name}
                className={`${styles.deviceRow} ${d.active ? styles.deviceRowActive : ''}`}
                onClick={() => d.id && transfer(d.id)}
                disabled={!d.id || d.active || transferringId !== null}
              >
                <span className={styles.deviceName}>
                  {d.name}
                  {d.isKiosk ? ' (this kiosk)' : ''}
                </span>
                {d.active ? (
                  <span className="tag tag-accent">Playing here</span>
                ) : transferringId === d.id ? (
                  <span className={styles.deviceHint}>Switching…</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
