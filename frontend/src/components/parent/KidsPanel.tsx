import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useParentUiStore } from '../../store/parentUiStore';
import type { ApiKid } from '../../api/types';
import { CloseIcon, PencilIcon } from '../icons';
import styles from './KidsPanel.module.css';

export default function KidsPanel() {
  const [kids, setKids] = useState<ApiKid[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const flash = useParentUiStore((s) => s.flash);

  const load = async () => {
    setKids(await api.get<ApiKid[]>('/api/kids'));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addKid = async () => {
    const name = newName.trim();
    if (!name) return;
    await api.post('/api/kids', { name });
    setNewName('');
    flash(`${name} added`);
    load();
  };

  const startEdit = (kid: ApiKid) => {
    setEditingId(kid.id);
    setEditName(kid.name);
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await api.patch(`/api/kids/${id}`, { name });
    setEditingId(null);
    flash('Name updated');
    load();
  };

  const removeKid = async (kid: ApiKid) => {
    await api.delete(`/api/kids/${kid.id}`);
    flash(`${kid.name} removed`);
    load();
  };

  if (loading) return null;

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>Users can create their own list of Favorites.</p>

      <div>
        <div className={styles.kicker}>Users</div>
        {kids.length === 0 && <div className={styles.empty}>No users added yet. Add one below.</div>}
        <div className={styles.list}>
          {kids.map((kid) => (
            <div key={kid.id} className={styles.row}>
              <span className={styles.avatar}>{kid.name[0]}</span>
              {editingId === kid.id ? (
                <div className={styles.editRow}>
                  <input
                    className="input"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(kid.id)}
                  />
                  <button className="btn btn-secondary" onClick={() => saveEdit(kid.id)}>
                    Save
                  </button>
                  <button className="btn btn-secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.name}>{kid.name}</span>
                  <div className={styles.actions}>
                    <button className="btn btn-icon btn-secondary" onClick={() => startEdit(kid)} aria-label="Rename">
                      <PencilIcon size={15} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary"
                      onClick={() => removeKid(kid)}
                      aria-label="Remove user"
                    >
                      <CloseIcon size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.kicker}>Add a user</div>
        <div className={styles.addRow}>
          <input
            className="input"
            placeholder="User's name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKid()}
          />
          <button className="btn btn-primary" onClick={addKid}>
            Add user
          </button>
        </div>
      </div>
    </div>
  );
}
