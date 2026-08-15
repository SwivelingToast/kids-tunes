import { useEffect } from 'react';
import { api } from '../../api/client';
import { useKidStore } from '../../store/kidStore';
import { useParentUiStore } from '../../store/parentUiStore';
import { formatDuration } from '../../lib/display';
import AlbumArt from '../AlbumArt';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from '../icons';
import styles from './QueuePanel.module.css';

export default function QueuePanel() {
  const queue = useKidStore((s) => s.queue);
  const refreshQueue = useKidStore((s) => s.refreshQueue);
  const currentSong = useKidStore((s) => s.currentSong());
  const advance = useKidStore((s) => s.advance);
  const flash = useParentUiStore((s) => s.flash);

  useEffect(() => {
    refreshQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSecs = queue.reduce((sum, q) => sum + (q.song?.durationSecs ?? 0), 0);

  const move = async (id: number, direction: 'up' | 'down') => {
    await api.post(`/api/queue/${id}/move`, { direction });
    refreshQueue();
  };

  const remove = async (id: number) => {
    await api.delete(`/api/queue/${id}`);
    refreshQueue();
  };

  const shuffle = async () => {
    await api.post('/api/queue/shuffle');
    refreshQueue();
    flash('Queue shuffled');
  };

  const clearAll = async () => {
    await api.delete('/api/queue');
    refreshQueue();
    flash('Queue cleared');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.summaryRow}>
        <p className={styles.summary}>
          {queue.length} up next · {formatDuration(totalSecs)} total
        </p>
        <div className={styles.summaryActions}>
          <button className="btn btn-secondary" onClick={shuffle} disabled={queue.length < 2}>
            Shuffle
          </button>
          <button className="btn btn-secondary" onClick={clearAll} disabled={queue.length === 0}>
            Clear all
          </button>
        </div>
      </div>

      {currentSong && (
        <div className={styles.nowPlayingStrip}>
          <AlbumArt song={currentSong} iconSize={20} iconOpacity={0.35} className={styles.npArt} />
          <div className={styles.npInfo}>
            <div className={styles.npTitle}>{currentSong.title}</div>
            <div className={styles.npMeta}>Now playing · {currentSong.artist}</div>
          </div>
          {/* Parent skip is immediate - no hold, unlike the kid-side control. */}
          <button className="btn btn-secondary" onClick={() => advance()}>
            Skip
          </button>
        </div>
      )}

      {queue.length === 0 ? (
        <div className={styles.empty}>Nothing queued. Songs the kids tap while music is playing land here.</div>
      ) : (
        <div className={styles.rows}>
          {queue.map((entry, i) =>
            entry.song ? (
              <div key={entry.id} className={styles.row}>
                <span className={styles.index}>{i + 1}</span>
                <AlbumArt song={entry.song} iconSize={16} iconOpacity={0.35} className={styles.rowArt} />
                <div className={styles.rowInfo}>
                  <div className={styles.rowTitle}>{entry.song.title}</div>
                  <div className={styles.rowMeta}>{entry.song.artist}</div>
                </div>
                <div className={styles.rowActions}>
                  <button
                    className="btn btn-icon btn-secondary"
                    onClick={() => move(entry.id, 'up')}
                    aria-label="Move up"
                    disabled={i === 0}
                  >
                    <ChevronUpIcon size={16} />
                  </button>
                  <button
                    className="btn btn-icon btn-secondary"
                    onClick={() => move(entry.id, 'down')}
                    aria-label="Move down"
                    disabled={i === queue.length - 1}
                  >
                    <ChevronDownIcon size={16} />
                  </button>
                  <button className="btn btn-icon btn-secondary" onClick={() => remove(entry.id)} aria-label="Remove">
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
