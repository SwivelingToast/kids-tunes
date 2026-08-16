import { useKidStore } from '../store/kidStore';
import styles from './PinScreen.module.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'x'];
const KEY_LABEL: Record<string, string> = { del: '⌫', x: '✕' };

export default function PinScreen() {
  const pinEntry = useKidStore((s) => s.pinEntry);
  const pinError = useKidStore((s) => s.pinError);
  const pressPinKey = useKidStore((s) => s.pressPinKey);
  const exitPin = useKidStore((s) => s.exitPin);
  const isAdmin = useKidStore((s) => s.isAdmin);

  return (
    <div className={styles.screen}>
      <div className={styles.glow} />

      <div className={styles.header}>
        <div className={styles.kicker}>Grown-ups only</div>
        <h2 style={{ margin: 0 }}>Enter your PIN</h2>
      </div>

      <div className={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`${styles.dot} ${i < pinEntry.length ? styles.dotFilled : styles.dotEmpty}`} />
        ))}
      </div>

      <div className={styles.keypad}>
        {KEYS.map((key) => (
          <button key={key} className={styles.key} onClick={() => pressPinKey(key)}>
            {KEY_LABEL[key] ?? key}
          </button>
        ))}
      </div>

      <div className={styles.error}>{pinError}</div>

      {!isAdmin && (
        <button
          className="btn btn-secondary"
          onClick={exitPin}
          style={{ position: 'relative', height: 52, padding: '0 26px', fontSize: 17, borderRadius: 'var(--radius-lg)' }}
        >
          Back to music
        </button>
      )}
    </div>
  );
}
