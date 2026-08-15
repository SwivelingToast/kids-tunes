import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useParentUiStore } from '../../store/parentUiStore';
import type { ApiPlaylist, ApiPlaylistSong, ApiSpotifyPlaylistPick } from '../../api/types';
import AlbumArt from '../AlbumArt';
import { CloseIcon } from '../icons';
import styles from './PlaylistsPanel.module.css';

const CHIP_LABEL: Record<ApiPlaylistSong['chip'], string> = {
  'in-jukebox': 'In jukebox',
  removed: 'Removed by you',
  blocked: 'Blocked',
};

function LinkedPlaylistCard({ playlist, onChanged }: { playlist: ApiPlaylist; onChanged: () => void }) {
  const [tracks, setTracks] = useState<ApiPlaylistSong[]>([]);
  const [syncing, setSyncing] = useState(false);
  const flash = useParentUiStore((s) => s.flash);

  const loadTracks = async () => {
    setTracks(await api.get<ApiPlaylistSong[]>(`/api/playlists/${playlist.id}/songs`));
  };

  useEffect(() => {
    loadTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.id, playlist.songCount, playlist.explicitHiddenCount]);

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<ApiPlaylist>(`/api/playlists/${playlist.id}/sync`);
      const added = result.addedCount ?? 0;
      const removed = result.removedCount ?? 0;
      flash(added || removed ? `${playlist.name}: ${added} new, ${removed} removed` : `${playlist.name} is already up to date`);
      onChanged();
    } finally {
      setSyncing(false);
    }
  };

  const unlink = async () => {
    await api.patch(`/api/playlists/${playlist.id}`, { linked: false });
    flash(`${playlist.name} unlinked`);
    onChanged();
  };

  const removeTrack = async (song: ApiPlaylistSong) => {
    await api.delete(`/api/playlists/${playlist.id}/songs/${song.id}`);
    flash(`${song.title} removed from ${playlist.name}`);
    loadTracks();
    onChanged();
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className={styles.nameRow}>
            <h4 style={{ margin: 0 }}>{playlist.name}</h4>
            {playlist.collaborative && <span className="tag tag-accent">Collaborative</span>}
          </div>
          <div className={styles.metaLine}>
            {playlist.owner} · {playlist.songCount} song{playlist.songCount === 1 ? '' : 's'} in the jukebox
          </div>
          {playlist.explicitHiddenCount > 0 && (
            <div className={styles.blockedLine}>
              {playlist.explicitHiddenCount} explicit track{playlist.explicitHiddenCount === 1 ? '' : 's'} hidden
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={sync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
        <button className="btn btn-secondary" onClick={unlink}>
          Unlink
        </button>
      </div>
      <div className={styles.divider} />
      <div className={styles.trackList}>
        {tracks.map((t) => (
          <div key={t.id} className={styles.trackRow}>
            <AlbumArt song={t} iconSize={14} iconOpacity={0.35} className={styles.trackThumb} />
            <span className={styles.trackTitle}>{t.title}</span>
            <span className={styles.trackArtist}>{t.artist}</span>
            <span className={`${styles.chip} ${t.chip === 'in-jukebox' ? styles.chipInJukebox : styles.chipMuted}`}>
              {CHIP_LABEL[t.chip]}
            </span>
            <button
              className="btn btn-icon btn-secondary"
              onClick={() => removeTrack(t)}
              aria-label="Remove from this playlist"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlaylistsPanel() {
  const [linked, setLinked] = useState<ApiPlaylist[]>([]);
  const [available, setAvailable] = useState<ApiSpotifyPlaylistPick[]>([]);
  const flash = useParentUiStore((s) => s.flash);

  const loadLinked = async () => setLinked(await api.get<ApiPlaylist[]>('/api/playlists'));
  const loadAvailable = async () => {
    const all = await api.get<ApiSpotifyPlaylistPick[]>('/api/spotify/playlists');
    setAvailable(all.filter((p) => !p.linked));
  };

  useEffect(() => {
    loadLinked();
    loadAvailable();
  }, []);

  const linkPlaylist = async (pick: ApiSpotifyPlaylistPick) => {
    const result = await api.post<ApiPlaylist>('/api/playlists', { playlistId: pick.id });
    flash(`${pick.name} linked — ${result.addedCount ?? 0} songs added`);
    loadLinked();
    loadAvailable();
  };

  const linkedPlaylists = linked.filter((p) => p.linked);

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.kicker}>Linked playlists</div>
        {linkedPlaylists.length === 0 && (
          <div className={styles.empty}>No playlists linked yet. Link one below to add its songs in bulk.</div>
        )}
        <div className={styles.linkedList}>
          {linkedPlaylists.map((p) => (
            <LinkedPlaylistCard key={p.id} playlist={p} onChanged={() => { loadLinked(); loadAvailable(); }} />
          ))}
        </div>
      </div>

      <div>
        <div className={styles.kicker}>Your Spotify playlists</div>
        {available.length === 0 && (
          <div className={styles.empty}>Every playlist on this account is already linked.</div>
        )}
        <div className={styles.availableList}>
          {available.map((p) => (
            <div key={p.id} className={styles.availableRow}>
              <div className={styles.availableInfo}>
                <div className={styles.availableNameRow}>
                  <span className={styles.availableName}>{p.name}</span>
                  {p.collaborative && <span className="tag tag-neutral">Collaborative</span>}
                </div>
                <div className={styles.availableMeta}>
                  {p.owner} · {p.trackCount} track{p.trackCount === 1 ? '' : 's'}
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => linkPlaylist(p)}>
                Link
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
