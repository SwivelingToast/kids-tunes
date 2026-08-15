import { useKidStore, type KidTab } from '../../store/kidStore';
import styles from './TabRow.module.css';

const TABS: { key: KidTab; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'songs', label: 'Songs' },
  { key: 'artists', label: 'Artists' },
  { key: 'favorites', label: 'Favorites' },
];

export default function TabRow() {
  const tab = useKidStore((s) => s.tab);
  const setTab = useKidStore((s) => s.setTab);

  return (
    <div className={styles.row}>
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`${styles.tab} ${tab === t.key ? styles.selected : styles.unselected}`}
          onClick={() => setTab(t.key)}
        >
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
