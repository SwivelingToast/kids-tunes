import { useEffect, useMemo, useRef } from 'react';
import { useKidStore } from '../../store/kidStore';
import type { ApiSong } from '../../api/types';
import { ChevronLeftIcon, StarIcon } from '../icons';
import AlbumArt from '../AlbumArt';
import styles from './BrowseGrid.module.css';

type Tile =
  | { kind: 'song'; song: ApiSong; starred: boolean }
  | { kind: 'artist'; name: string; count: number; artUrl: string | null; artId: string };

// Long enough to be clearly deliberate (not a normal tap), short enough to
// not feel unresponsive - matches the general feel of the skip-hold gesture
// in NowPlayingBar.
const LONG_PRESS_MS = 500;

export default function BrowseGrid() {
  const tab = useKidStore((s) => s.tab);
  const artist = useKidStore((s) => s.artist);
  const setArtist = useKidStore((s) => s.setArtist);
  const favKid = useKidStore((s) => s.favKid);
  const setFavKid = useKidStore((s) => s.setFavKid);
  const kids = useKidStore((s) => s.kids);
  const recent = useKidStore((s) => s.recent);
  const favorites = useKidStore((s) => s.favorites);
  const songs = useKidStore((s) => s.songs);
  const tapSong = useKidStore((s) => s.tapSong);
  const openFavorites = useKidStore((s) => s.openFavorites);

  // A long press opens the favorites picker instead of tapping/queuing the
  // song - tracked in a ref (not state) since it only needs to suppress the
  // click that follows the same pointer sequence, not trigger a re-render.
  const longPressFired = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    },
    [],
  );

  const startLongPress = (songId: string) => {
    longPressFired.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      openFavorites(songId);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleTileClick = (songId: string) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    tapSong(songId);
  };

  const findSong = (id: string) => songs.find((s) => s.id === id);
  const isStarred = (id: string) => kids.some((k) => (favorites[k.id] ?? []).includes(id));

  const { heading, emptyText, tiles } = useMemo(() => {
    if (tab === 'recent') {
      const list = recent.map(findSong).filter((s): s is ApiSong => !!s);
      return { heading: 'Played lately', emptyText: 'Nothing here yet.', tiles: list.map<Tile>((s) => ({ kind: 'song', song: s, starred: isStarred(s.id) })) };
    }
    if (tab === 'songs') {
      const list = [...songs].sort((a, b) => a.title.localeCompare(b.title));
      return { heading: 'All songs', emptyText: 'Nothing here yet.', tiles: list.map<Tile>((s) => ({ kind: 'song', song: s, starred: isStarred(s.id) })) };
    }
    if (tab === 'artists') {
      if (artist) {
        const list = songs.filter((s) => s.artist === artist);
        return { heading: artist, emptyText: 'Nothing here yet.', tiles: list.map<Tile>((s) => ({ kind: 'song', song: s, starred: isStarred(s.id) })) };
      }
      const names = Array.from(new Set(songs.map((s) => s.artist)));
      const artistTiles = names.map<Tile>((name) => {
        const byArtist = songs.filter((s) => s.artist === name);
        const representative = byArtist[0];
        return { kind: 'artist', name, count: byArtist.length, artUrl: representative?.artUrl ?? null, artId: representative?.id ?? name };
      });
      return { heading: 'Artists', emptyText: 'Nothing here yet.', tiles: artistTiles };
    }
    // favorites
    const kid = kids.find((k) => k.id === favKid);
    const list = (favKid ? (favorites[favKid] ?? []) : []).map(findSong).filter((s): s is ApiSong => !!s);
    return {
      heading: kid ? `${kid.name}'s favorites` : 'Favorites',
      emptyText: 'No favorites yet. Tap the star while a song plays.',
      tiles: list.map<Tile>((s) => ({ kind: 'song', song: s, starred: isStarred(s.id) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, artist, favKid, recent, favorites, songs, kids]);

  const countLabel = tab === 'artists' && !artist ? `${tiles.length} artists` : `${tiles.length} songs`;

  return (
    <div className={styles.scroll}>
      {tab === 'artists' && artist && (
        <button className={styles.backBtn} onClick={() => setArtist(null)}>
          <ChevronLeftIcon size={20} />
          All artists
        </button>
      )}

      {tab === 'favorites' && (
        <div className={styles.chipRow}>
          {kids.map((k) => (
            <button
              key={k.id}
              className={`${styles.chip} ${favKid === k.id ? styles.chipSelected : styles.chipUnselected}`}
              onClick={() => setFavKid(k.id)}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}

      <div className={styles.headingRow}>
        <span className={styles.headingTitle}>{heading}</span>
        <span className={styles.headingCount}>{countLabel}</span>
      </div>

      {tiles.length === 0 && <div className={styles.empty}>{emptyText}</div>}

      <div className={styles.grid}>
        {tiles.map((tile) =>
          tile.kind === 'song' ? (
            <button
              key={tile.song.id}
              className={styles.tile}
              onPointerDown={() => startLongPress(tile.song.id)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onClick={() => handleTileClick(tile.song.id)}
            >
              <AlbumArt song={tile.song} iconSize={46} iconOpacity={0.3} className={styles.tileArt}>
                {tile.starred && (
                  <span className={styles.badge}>
                    <StarIcon size={20} filled />
                  </span>
                )}
              </AlbumArt>
              <span className={styles.tileTitle}>{tile.song.title}</span>
              <span className={styles.tileSub}>{tile.song.artist}</span>
            </button>
          ) : (
            <button key={tile.name} className={styles.tile} onClick={() => setArtist(tile.name)}>
              <AlbumArt song={{ id: tile.artId, artUrl: tile.artUrl }} iconSize={46} iconOpacity={0.3} className={styles.tileArt}>
                <span className={styles.artistCaption}>{tile.count} songs</span>
              </AlbumArt>
              <span className={styles.tileTitle}>{tile.name}</span>
              <span className={styles.tileSub}>{tile.count} songs</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
