import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from './accessToken';
import { api } from '../api/client';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track?: { uri: string } };
}

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (data: any) => void): void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// A freshly-registered Connect device can briefly 500 on the public
// /me/player endpoints right after connecting, even though it's already
// working at the SDK/websocket level - retry transient server errors a
// couple of times before giving up.
async function fetchSpotifyWithRetry(url: string, init: RequestInit, retries = 2, delayMs = 600): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(url, init);
    if (resp.ok || resp.status < 500 || attempt >= retries) return resp;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function loadSdkScript() {
  if (document.getElementById('spotify-player-sdk')) return;
  const script = document.createElement('script');
  script.id = 'spotify-player-sdk';
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  script.async = true;
  document.body.appendChild(script);
}

interface UsePlaybackSDKOptions {
  onTrackEnd: () => void;
}

// Wraps Spotify's Web Playback SDK: registers this browser tab as a
// Connect device and exposes playTrackUri()/pausePlayback()/resumePlayback().
//
// Deliberately does NOT reclaim the device the instant it becomes ready -
// the prior iteration of this project had a bug where an automatic
// reclaim-and-play right after device registration raced Spotify's backend
// not yet fully indexing the new device, causing intermittent "cannot
// reach connect device" errors. Transfer/play only ever happens in
// response to an explicit playTrackUri() call.
export function usePlaybackSDK({ onTrackEnd }: UsePlaybackSDKOptions) {
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const progressRef = useRef({ position: 0, duration: 0, updatedAt: Date.now(), paused: true });
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const lastKnownRef = useRef<{ uri?: string; position: number } | null>(null);
  const onTrackEndRef = useRef(onTrackEnd);
  onTrackEndRef.current = onTrackEnd;

  // True while we're actively issuing our own transfer+play sequence. The
  // transfer alone triggers a player_state_changed reporting the *previous*
  // track as paused at position 0 - identical in shape to that track having
  // ended naturally, which would otherwise double-fire onTrackEnd and race
  // with the play we're already doing.
  const isTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTransitioning() {
    isTransitioningRef.current = false;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    loadSdkScript();

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify!.Player({
        name: 'Kids Jukebox',
        getOAuthToken: (cb) => getAccessToken().then(cb),
        volume: 0.8,
      });
      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setReady(true);
        setReconnecting(false);
        api.post('/api/spotify/device', { deviceId: device_id }).catch(() => {});
      });

      player.addListener('not_ready', () => {
        setReconnecting(true);
      });

      // Without these, failures here (non-Premium account, no DRM/EME
      // support in the browser, expired token, etc.) are otherwise
      // completely silent - no audio, no error, no clue why.
      player.addListener('initialization_error', ({ message }: { message: string }) => {
        setError(`Player failed to initialize: ${message}`);
      });
      player.addListener('authentication_error', ({ message }: { message: string }) => {
        setError(`Spotify authentication failed: ${message}`);
      });
      player.addListener('account_error', ({ message }: { message: string }) => {
        setError(`Spotify account error (Premium required): ${message}`);
      });
      player.addListener('playback_error', ({ message }: { message: string }) => {
        setError(`Playback error: ${message}`);
      });

      player.addListener('player_state_changed', (state: SpotifyPlayerState | null) => {
        if (!state) {
          setIsPlaying(false);
          progressRef.current = { position: 0, duration: 0, updatedAt: Date.now(), paused: true };
          return;
        }
        setIsPlaying(!state.paused);
        progressRef.current = {
          position: state.position,
          duration: state.duration,
          updatedAt: Date.now(),
          paused: state.paused,
        };

        const current = { uri: state.track_window.current_track?.uri, position: state.position };
        const prev = lastKnownRef.current;

        const looksLikeTrackEnd =
          !isTransitioningRef.current &&
          prev &&
          prev.uri === current.uri &&
          prev.position > 0 &&
          state.paused &&
          state.position === 0;

        if (looksLikeTrackEnd) {
          onTrackEndRef.current?.();
        }

        // Once the new track is confirmed actually playing, our own
        // transfer/play sequence is done and end-detection can resume.
        if (isTransitioningRef.current && !state.paused) {
          clearTransitioning();
        }

        lastKnownRef.current = current;
      });

      player.connect();
    };

    return () => {
      playerRef.current?.disconnect();
    };
  }, []);

  // The SDK only fires player_state_changed on actual state transitions
  // (play/pause/seek/track change), not continuously - interpolate a
  // smooth, informational-only position between those events based on
  // elapsed wall-clock time.
  useEffect(() => {
    function tick() {
      const { position, duration, updatedAt, paused } = progressRef.current;
      setDurationMs(duration);
      if (!duration) {
        setPositionMs(0);
        return;
      }
      const elapsed = paused ? 0 : Date.now() - updatedAt;
      setPositionMs(Math.min(position + elapsed, duration));
    }
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, []);

  async function playTrackUri(uri: string): Promise<boolean> {
    if (!deviceId) {
      setError('No Spotify Connect device yet - the player has not finished initializing.');
      return false;
    }
    const accessToken = await getAccessToken();

    // Reset immediately rather than waiting for the SDK's next
    // player_state_changed, which lags this call by up to a couple
    // seconds and would otherwise keep showing the previous track's stale
    // position in the meantime.
    progressRef.current = { position: 0, duration: 0, updatedAt: Date.now(), paused: true };
    setPositionMs(0);

    isTransitioningRef.current = true;
    // Safety net: if we never see a confirming "playing" state (e.g. a
    // network hiccup), don't leave end-detection suppressed forever.
    transitionTimeoutRef.current = setTimeout(clearTransitioning, 5000);

    // This transfers playback to device_id (reclaiming it from another
    // Connect device on the account if needed) as part of the same call -
    // a separate PUT /me/player transfer call isn't required, and has been
    // observed to consistently 500 on some accounts, so it's skipped.
    const playRes = await fetchSpotifyWithRetry(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    });
    if (!playRes.ok) {
      const body = await playRes.text().catch(() => '');
      setError(`Failed to start playback: ${playRes.status} ${body}`);
      clearTransitioning();
      return false;
    }

    setError(null);
    return true;
  }

  async function setPaused(paused: boolean): Promise<boolean> {
    if (!deviceId) return false;
    const accessToken = await getAccessToken();

    const res = await fetchSpotifyWithRetry(
      `https://api.spotify.com/v1/me/player/${paused ? 'pause' : 'play'}?device_id=${deviceId}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      setError(`Failed to ${paused ? 'pause' : 'resume'} playback: ${res.status} ${body}`);
      return false;
    }
    setError(null);
    setIsPlaying(!paused);
    return true;
  }

  // Explicitly stop the device rather than leaving whatever was last
  // playing running orphaned when the queue runs out.
  const pausePlayback = async () => {
    const ok = await setPaused(true);
    if (ok) {
      progressRef.current = { position: 0, duration: 0, updatedAt: Date.now(), paused: true };
      setPositionMs(0);
    }
    return ok;
  };
  const resumePlayback = () => setPaused(false);

  return {
    ready,
    deviceId,
    reconnecting,
    error,
    isPlaying,
    positionMs,
    durationMs,
    playTrackUri,
    pausePlayback,
    resumePlayback,
  };
}
