import { useParentUiStore } from '../../store/parentUiStore';
import styles from './ParentToast.module.css';

export default function ParentToast() {
  const toast = useParentUiStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={styles.toast} key={toast}>
      {toast}
    </div>
  );
}
