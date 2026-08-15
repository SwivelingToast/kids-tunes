import { useRef, useState } from 'react';
import { useKidStore } from '../../store/kidStore';
import styles from './HiddenCornerTrigger.module.css';

const HOLD_MS = 1500;

// No label, no icon - nothing discoverable by a child. Holding this corner
// for 1.5s is the only way into the parent area.
export default function HiddenCornerTrigger() {
  const enterPin = useKidStore((s) => s.enterPin);
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      enterPin();
    }, HOLD_MS);
  };

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPressing(false);
  };

  return (
    <>
      <div className={styles.corner} onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} />
      {pressing && <div className={styles.dot} />}
    </>
  );
}
