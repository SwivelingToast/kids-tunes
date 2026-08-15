import { useKidStore } from '../../store/kidStore';
import styles from './Toast.module.css';

export default function Toast() {
  const toast = useKidStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={styles.toast} key={toast}>
      {toast}
    </div>
  );
}
