import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useParentUiStore } from '../../store/parentUiStore';
import type { ApiSearchResult, ApiSong } from '../../api/types';
import AlbumArt from '../AlbumArt';
import { CloseIcon } from '../icons';
import { formatDuration } from '../../lib/display';
import styles from './SongsPanel.module.css';

const SEARCH_DEBOUNCE_MS = 350;

export default function SongsPanel() {
  const [library, setLibrary] = useState<ApiSong[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const flash = useParentUiStore((s) => s.flash);

  const loadLibrary = async () => {
    setLibrary(await api.get<ApiSong[]>('/api/songs'));
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await api.get<ApiSearchResult[]>(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      setResults(found);
      setSearched(true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const addSong = async (result: ApiSearchResult) => {
    await api.post('/api/songs', { trackId: result.id });
    setResults((r) => r.filter((x) => x.id !== result.id));
    flash(`${result.title} added to the jukebox`);
    loadLibrary();
  };

  const toggleHidden = async (song: ApiSong) => {
    if (song.explicit) return;
    await api.patch(`/api/songs/${song.id}`, { hidden: !song.hidden });
    loadLibrary();
  };

  const removeSong = async (song: ApiSong) => {
    await api.delete(`/api/songs/${song.id}`);
    loadLibrary();
  };

  const toggleClass = (song: ApiSong) =>
    song.state === 'allowed' ? styles.toggleAllowed : song.state === 'hidden' ? styles.toggleHidden : styles.toggleBlocked;
  const toggleLabel = (song: ApiSong) => (song.state === 'allowed' ? 'Allowed' : song.state === 'hidden' ? 'Hidden' : 'Blocked');

  return (
    <div className={styles.wrap}>
      <div className={styles.searchCard}>
        <div className={styles.kicker}>Search all of Spotify</div>
        <div className={styles.searchRow}>
          <input
            className={`input ${styles.searchInput}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Any song or artist on Spotify — try "bunny", "robot", "beach"'
          />
          <button className="btn btn-secondary" style={{ height: 42 }} onClick={() => setQuery('')}>
            Clear
          </button>
        </div>

        {query.trim() && (
          <div className={styles.results}>
            {results.map((r) => (
              <div key={r.id} className={styles.resultRow}>
                <AlbumArt song={r} iconSize={20} iconOpacity={0.35} className={styles.thumb} />
                <div className={styles.resultInfo}>
                  <div className={styles.resultTitleRow}>
                    <span className={styles.resultTitle}>{r.title}</span>
                    {r.explicit && <span className="tag tag-neutral">Explicit</span>}
                  </div>
                  <div className={styles.resultMeta}>
                    {r.artist} · {formatDuration(r.durationSecs)}
                  </div>
                </div>
                {r.explicit ? (
                  <span className={styles.addBtnBlocked}>Blocked — explicit</span>
                ) : (
                  <button className={styles.addBtn} onClick={() => addSong(r)}>
                    Add
                  </button>
                )}
              </div>
            ))}
            {searched && results.length === 0 && (
              <div className={styles.emptyDashed}>No matches found.</div>
            )}
          </div>
        )}
      </div>

      <div className={styles.libraryHeader}>
        <h4 className={styles.libraryHeading}>In the jukebox</h4>
        <span className={styles.libraryCount}>{library.length} songs</span>
      </div>
      <p className={styles.libraryIntro}>
        One flat list, however a song got here — searched and added, or pulled in by a linked playlist. Hidden songs
        stay listed but never reach the kids' browser; Remove takes the song out of the jukebox even if its playlist
        still has it.
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Song</th>
            <th>Artist</th>
            <th>Source</th>
            <th style={{ textAlign: 'right' }}>Kids can play</th>
          </tr>
        </thead>
        <tbody>
          {library.map((song) => (
            <tr key={song.id}>
              <td>
                <div className={styles.songCell}>
                  <AlbumArt song={song} iconSize={18} iconOpacity={0.35} className={styles.thumbSmall} />
                  <span>{song.title}</span>
                  {song.explicit && <span className="tag tag-neutral">Explicit</span>}
                </div>
              </td>
              <td className="text-muted">{song.artist}</td>
              <td className="text-muted" style={{ fontSize: 12 }}>
                {song.source}
              </td>
              <td style={{ textAlign: 'right' }}>
                <div className={styles.actionsCell}>
                  <button className={`${styles.toggleBtn} ${toggleClass(song)}`} onClick={() => toggleHidden(song)}>
                    {toggleLabel(song)}
                  </button>
                  <button className="btn btn-icon btn-secondary" onClick={() => removeSong(song)} aria-label="Remove from jukebox">
                    <CloseIcon size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
