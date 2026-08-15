import { useEffect, useRef, useState } from 'react';
import { useKidStore } from '../../store/kidStore';
import { formatDuration } from '../../lib/display';
import { PauseIcon, PlayIcon, SkipIcon, StarIcon } from '../icons';
import AlbumArt from '../AlbumArt';
import styles from './NowPlayingBar.module.css';

const SKIP_HOLD_MS = 1000;
const SKIP_SIZE = 72;
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function NowPlayingBar() {
  const song = useKidStore((s) => s.currentSong());
  const playing = useKidStore((s) => s.playing);
  const pos = useKidStore((s) => s.pos);
  const sdkReady = useKidStore((s) => s.sdkReady);
  const sdkError = useKidStore((s) => s.sdkError);
  const favorites = useKidStore((s) => s.favorites);
  const kids = useKidStore((s) => s.kids);
  const togglePlay = useKidStore((s) => s.togglePlay);
  const advance = useKidStore((s) => s.advance);
  const openFavorites = useKidStore((s) => s.openFavorites);

  const [skipHold, setSkipHold] = useState(0);
  const skipStartRef = useRef(0);
  const skipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
  }, []);

  const startSkipHold = () => {
    skipStartRef.current = Date.now();
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
    setSkipHold(0.02);
    skipTimerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - skipStartRef.current) / SKIP_HOLD_MS);
      if (p >= 1) {
        if (skipTimerRef.current) clearInterval(skipTimerRef.current);
        skipTimerRef.current = null;
        setSkipHold(0);
        advance();
      } else {
        setSkipHold(p);
      }
    }, 40);
  };

  const endSkipHold = () => {
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
    skipTimerRef.current = null;
    setSkipHold(0);
  };

  const queueCount = useKidStore((s) => s.queue.length);
  const favoritingKids = song ? kids.filter((k) => (favorites[k.id] ?? []).includes(song.id)) : [];
  const pct = song ? Math.min(100, (pos / song.durationSecs) * 100) : 0;
  const controlsEnabled = !!song && sdkReady;
  const kickerText = !song ? '' : !sdkReady ? 'Connecting…' : playing ? 'Now playing' : 'Paused';

  return (
    <div className={styles.bar}>
      <div className={styles.divider} />
      <div className={styles.glow} />

      <div className={styles.row1}>
        {song ? (
          <AlbumArt key={song.id} song={song} iconSize={58} className={styles.art} />
        ) : (
          <div className={styles.artIdle}>Pick a song!</div>
        )}
        <div className={styles.textCol}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}>{kickerText}</span>
            {playing && song && (
              <div className={styles.eq}>
                <span className={`${styles.eqBar} ${styles.eqBar1}`} />
                <span className={`${styles.eqBar} ${styles.eqBar2}`} />
                <span className={`${styles.eqBar} ${styles.eqBar3}`} />
              </div>
            )}
          </div>
          <div className={styles.title}>{song?.title}</div>
          <div className={styles.artist}>{song?.artist}</div>
        </div>
      </div>

      <div className={styles.progressRow}>
        <span className={styles.time}>{song ? formatDuration(pos) : '0:00'}</span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
        <span className={`${styles.time} ${styles.timeRight}`}>{song ? formatDuration(song.durationSecs) : '0:00'}</span>
      </div>

      <div className={styles.controlsRow}>
        <button className={styles.playBtn} onClick={togglePlay} aria-label="Play or pause" disabled={!controlsEnabled}>
          {playing ? <PauseIcon size={38} /> : <PlayIcon size={40} />}
        </button>

        <div className={styles.skipWrap}>
          <button
            className={styles.skipBtn}
            onPointerDown={controlsEnabled ? startSkipHold : undefined}
            onPointerUp={endSkipHold}
            onPointerLeave={endSkipHold}
            onPointerCancel={endSkipHold}
            aria-label="Hold to skip to the next song"
            disabled={!controlsEnabled}
          >
            <svg className={styles.skipRing} width={SKIP_SIZE} height={SKIP_SIZE} viewBox={`0 0 ${SKIP_SIZE} ${SKIP_SIZE}`}>
              <circle
                cx={SKIP_SIZE / 2}
                cy={SKIP_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={skipHold > 0 ? 'var(--color-accent)' : 'transparent'}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - skipHold)}
              />
            </svg>
            <span className={styles.skipInner}>
              <SkipIcon size={24} />
              <span className={styles.holdLabel}>Hold</span>
            </span>
          </button>
          <span className={styles.queueCount}>{queueCount} up next</span>
        </div>

        <div className={styles.spacer} />

        <button className={styles.favBtn} onClick={openFavorites} aria-label="Add to favorites" disabled={!song}>
          <StarIcon
            size={36}
            filled={favoritingKids.length > 0}
            outlineColor="currentColor"
          />
          <span className={styles.favLabel}>
            {favoritingKids.length > 0 ? favoritingKids.map((k) => k.name).join(', ') : 'Favorite'}
          </span>
        </button>
      </div>

      {sdkError && <div className={styles.sdkError}>{sdkError}</div>}
    </div>
  );
}
