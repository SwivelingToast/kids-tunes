import { useKidStore } from '../../store/kidStore';
import { StarIcon } from '../icons';
import styles from './FavoritesModal.module.css';

export default function FavoritesModal() {
  const song = useKidStore((s) => s.currentSong());
  const kids = useKidStore((s) => s.kids);
  const favorites = useKidStore((s) => s.favorites);
  const toggleFavorite = useKidStore((s) => s.toggleFavorite);
  const closeFavorites = useKidStore((s) => s.closeFavorites);

  if (!song) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div>
          <div className={styles.kicker}>Add to favorites</div>
          <div className={styles.songTitle}>{song.title}</div>
          <div className={styles.subLine}>Whose favorite is this?</div>
        </div>

        <div className={styles.rows}>
          {kids.map((kid) => {
            const on = (favorites[kid.id] ?? []).includes(song.id);
            return (
              <button
                key={kid.id}
                className={`${styles.row} ${on ? styles.rowOn : styles.rowOff}`}
                onClick={() => toggleFavorite(kid.id)}
              >
                <span className={`${styles.avatar} ${on ? styles.avatarOn : styles.avatarOff}`}>
                  {kid.name[0]}
                </span>
                <span className={styles.name}>{kid.name}</span>
                <span className={styles.hint}>{on ? 'Tap to remove' : 'Tap to add'}</span>
                <StarIcon size={30} filled={on} outlineColor={on ? '#b5abfc' : 'color-mix(in srgb, #e9e9ed 40%, transparent)'} />
              </button>
            );
          })}
        </div>

        <button
          className="btn btn-secondary"
          onClick={closeFavorites}
          style={{ height: 58, fontSize: 20, borderRadius: 'var(--radius-lg)' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
