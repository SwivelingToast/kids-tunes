import { useState } from 'react';
import { api, ApiError } from '../../api/client';

export default function ChangePinPanel() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState(false);

  const save = async () => {
    if (next !== confirm) {
      setMessage('The two new PINs do not match.');
      setOk(false);
      return;
    }
    try {
      await api.post('/api/pin/change', { currentPin: current, newPin: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage('PIN updated.');
      setOk(true);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not reach the jukebox server.');
      setOk(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <p style={{ fontSize: 14, color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', margin: 0 }}>
        Use this to change your PIN, pick a good one!
      </p>

      <div className="field">
        <label>Current PIN</label>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={current}
          onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="field">
        <label>New PIN</label>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={next}
          onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="field">
        <label>Confirm new PIN</label>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      {message && (
        <div style={{ fontSize: 14, color: ok ? 'var(--color-accent-300)' : 'var(--color-neutral-400)' }}>
          {message}
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={save} style={{ height: 46 }}>
        Save new PIN
      </button>
    </div>
  );
}
