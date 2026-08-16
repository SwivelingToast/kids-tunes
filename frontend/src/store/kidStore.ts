import { create } from 'zustand';
import { api, ApiError } from '../api/client';
import type { ApiKid, ApiQueueEntry, ApiSong } from '../api/types';

export type KidTab = 'recent' | 'songs' | 'artists' | 'favorites';
export type View = 'kid' | 'pin' | 'parent';
export type ParentTab = 'songs' | 'playlists' | 'queue' | 'spotify' | 'kids' | 'pin';

const RECENT_STORAGE_KEY = 'kids-jukebox:recent';
const RECENT_MAX = 9;

// A device reached via /admin is a remote parent-administration session,
// not the kiosk - it skips the kid screen (and the Spotify Web Playback
// SDK entirely, see App.tsx) and only ever shows the PIN/parent views, so
// it can never register as a competing Connect device or steal playback
// just by being opened. See hotfix/prevent-remote-playback-hijack for the
// related bug this avoids re-introducing.
const isAdminPath = window.location.pathname.replace(/\/+$/, '') === '/admin';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function loadStoredRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface KidState {
  songs: ApiSong[];
  kids: ApiKid[];
  recent: string[];
  favorites: Record<string, string[]>;
  queue: ApiQueueEntry[];

  loading: boolean;
  loadError: string | null;

  // Navigation - the PIN screen must be re-entered every time; there is no
  // persisted "already authenticated" flag. The only path to 'parent' is a
  // correct pressPinKey() sequence verified server-side.
  view: View;
  parentTab: ParentTab;
  pinEntry: string;
  pinError: string;
  isAdmin: boolean;

  // Real Spotify player state, mirrored in from the Web Playback SDK hook
  // (see usePlaybackSDK + syncPlaybackState) - this store never drives
  // playback itself, it only orchestrates *what* should play and delegates
  // the actual audio calls to the bound SDK controls below.
  playingId: string | null;
  playing: boolean;
  pos: number;
  sdkReady: boolean;
  sdkReconnecting: boolean;
  sdkError: string | null;

  // Bound once from KidScreen when the SDK hook mounts. Nullable because
  // the store can exist (and tapSong/advance can theoretically fire)
  // before the hook has had a chance to register them.
  _playTrackUri: ((uri: string) => Promise<boolean>) | null;
  _pausePlayback: (() => Promise<boolean>) | null;
  _resumePlayback: (() => Promise<boolean>) | null;

  tab: KidTab;
  artist: string | null;
  favKid: string | null;

  favTarget: string | null;
  toast: string;

  currentSong: () => ApiSong | null;

  loadAll: () => Promise<void>;
  refreshQueue: () => Promise<void>;

  togglePlay: () => Promise<void>;
  advance: () => Promise<void>;
  tapSong: (id: string) => Promise<void>;

  bindPlaybackControls: (controls: {
    playTrackUri: (uri: string) => Promise<boolean>;
    pausePlayback: () => Promise<boolean>;
    resumePlayback: () => Promise<boolean>;
  }) => void;
  syncPlaybackState: (state: {
    isPlaying: boolean;
    posSeconds: number;
    ready: boolean;
    reconnecting: boolean;
    error: string | null;
  }) => void;

  openFavorites: (songId: string) => void;
  closeFavorites: () => void;
  toggleFavorite: (kidId: string) => Promise<void>;

  setTab: (tab: KidTab) => void;
  setArtist: (artist: string | null) => void;
  setFavKid: (kidId: string) => void;

  enterPin: () => void;
  pressPinKey: (key: string) => void;
  exitPin: () => void;
  exitParent: () => void;
  setParentTab: (tab: ParentTab) => void;

  flash: (message: string) => void;
}

export const useKidStore = create<KidState>((set, get) => ({
  songs: [],
  kids: [],
  recent: loadStoredRecent(),
  favorites: {},
  queue: [],

  loading: true,
  loadError: null,

  view: isAdminPath ? 'pin' : 'kid',
  parentTab: 'songs',
  pinEntry: '',
  pinError: '',
  isAdmin: isAdminPath,

  playingId: null,
  playing: false,
  pos: 0,
  sdkReady: false,
  sdkReconnecting: false,
  sdkError: null,
  _playTrackUri: null,
  _pausePlayback: null,
  _resumePlayback: null,

  tab: 'recent',
  artist: null,
  favKid: null,

  favTarget: null,
  toast: '',

  currentSong: () => get().songs.find((s) => s.id === get().playingId) ?? null,

  loadAll: async () => {
    set({ loading: true, loadError: null });
    try {
      const [songs, kids, queue] = await Promise.all([
        api.get<ApiSong[]>('/api/songs/playable'),
        api.get<ApiKid[]>('/api/kids'),
        api.get<ApiQueueEntry[]>('/api/queue'),
      ]);
      const favEntries = await Promise.all(
        kids.map(async (k) => [k.id, (await api.get<ApiSong[]>(`/api/kids/${k.id}/favorites`)).map((s) => s.id)] as const),
      );
      const favorites = Object.fromEntries(favEntries);

      // Nothing has necessarily been chosen yet - stay idle rather than
      // picking an arbitrary song, unless there's already a valid current
      // one from before this (re-)load (e.g. returning from the parent view).
      const currentStillValid = get().playingId && songs.some((s) => s.id === get().playingId);

      set({
        songs,
        kids,
        queue,
        favorites,
        favKid: get().favKid ?? kids[0]?.id ?? null,
        playingId: currentStillValid ? get().playingId : null,
        loading: false,
      });

      // Deliberately does NOT auto-advance an idle-but-queued state here.
      // Every fresh page load starts with local playingId=null, so any
      // device loading the app while the shared queue is non-empty would
      // otherwise silently pop the real server-side queue and start
      // playback through *that device's own* Spotify Connect id - e.g. a
      // parent opening the site on their phone stealing/corrupting the
      // kiosk's playback just by loading the page. Idle-with-a-queue is
      // instead a normal, tap-to-resume state (see togglePlay) so the
      // kiosk itself isn't left stuck without relying on this.
    } catch (err) {
      set({ loading: false, loadError: err instanceof Error ? err.message : 'Could not reach the jukebox server.' });
    }
  },

  refreshQueue: async () => {
    const queue = await api.get<ApiQueueEntry[]>('/api/queue');
    set({ queue });
  },

  togglePlay: async () => {
    const { playing, playingId, queue, _pausePlayback, _resumePlayback } = get();
    if (playing) {
      await _pausePlayback?.();
      return;
    }
    // Idle with a non-empty queue (e.g. after a fresh page load) has
    // nothing loaded in the player to resume - start the queue instead.
    // This is the deliberate, tap-triggered replacement for the old
    // auto-advance-on-load behavior (see loadAll).
    if (!playingId && queue.length > 0) {
      await get().advance();
      return;
    }
    await _resumePlayback?.();
    // isPlaying updates reactively via syncPlaybackState once the SDK
    // confirms the real state change - not set optimistically here.
  },

  // Deviates from the README/reference prototype, which fell back to
  // cycling alphabetically through the library when the queue was empty.
  // User explicitly wants skip/track-end to just stop when there's nothing
  // queued, not pick something arbitrary - see project memory.
  advance: async () => {
    const { next } = await api.post<{ next: ApiQueueEntry | null }>('/api/queue/advance');
    get().refreshQueue();

    if (next?.song) {
      const id = next.song.id;
      await get()._playTrackUri?.(`spotify:track:${id}`);
      set((s) => ({
        playingId: id,
        recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, RECENT_MAX),
      }));
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(get().recent));
      return;
    }

    await get()._pausePlayback?.();
    set({ playingId: null });
  },

  // Enqueues whenever there's something worth preserving - either actively
  // playing, or paused with songs already stacked up behind it (tapping
  // must never discard a paused song or jump the line ahead of a queue).
  // Only plays immediately when truly nothing is happening: paused with an
  // empty queue, where there's nothing to interrupt or skip ahead of.
  tapSong: async (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (!song) return;

    if (!get().playing && get().queue.length === 0) {
      await get()._playTrackUri?.(`spotify:track:${id}`);
      set((s) => ({
        playingId: id,
        recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, RECENT_MAX),
      }));
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(get().recent));
      get().flash(`Playing ${song.title}`);
      return;
    }

    await api.post('/api/queue', { songId: id });
    await get().refreshQueue();
    get().flash(`${song.title} added to the queue`);
  },

  // Called once from KidScreen when the Web Playback SDK hook mounts -
  // the store orchestrates *what* should play, these are how it actually
  // makes that happen.
  bindPlaybackControls: (controls) =>
    set({
      _playTrackUri: controls.playTrackUri,
      _pausePlayback: controls.pausePlayback,
      _resumePlayback: controls.resumePlayback,
    }),

  // Called reactively from KidScreen whenever the SDK hook's own state
  // changes (player_state_changed events) - this store never advances
  // `pos` on a timer itself, it just mirrors what Spotify reports. Track-end
  // detection lives entirely in the hook (onTrackEnd -> advance()); this is
  // pure mirroring, not another place that decides when a track ended.
  syncPlaybackState: ({ isPlaying, posSeconds, ready, reconnecting, error }) => {
    set({ playing: isPlaying, pos: posSeconds, sdkReady: ready, sdkReconnecting: reconnecting, sdkError: error });
  },

  openFavorites: (songId) => set({ favTarget: songId }),
  closeFavorites: () => set({ favTarget: null }),

  toggleFavorite: async (kidId) => {
    const { favTarget, favorites, kids } = get();
    if (!favTarget) return;
    const kid = kids.find((k) => k.id === kidId);
    if (!kid) return;
    const current = favorites[kidId] ?? [];
    const has = current.includes(favTarget);

    if (has) {
      await api.delete(`/api/kids/${kidId}/favorites/${favTarget}`);
    } else {
      await api.post(`/api/kids/${kidId}/favorites`, { songId: favTarget });
    }
    const next = has ? current.filter((id) => id !== favTarget) : [...current, favTarget];
    set({ favorites: { ...favorites, [kidId]: next }, favTarget: null });
    get().flash(has ? `Removed from ${kid.name}'s favorites` : `Saved to ${kid.name}'s favorites`);
  },

  setTab: (tab) => set({ tab, artist: null }),
  setArtist: (artist) => set({ artist }),
  setFavKid: (favKid) => set({ favKid }),

  enterPin: () => set({ view: 'pin', pinEntry: '', pinError: '' }),

  pressPinKey: (key) => {
    if (key === 'del') {
      set((s) => ({ pinEntry: s.pinEntry.slice(0, -1), pinError: '' }));
      return;
    }
    if (key === 'x') {
      get().exitPin();
      return;
    }
    const entry = get().pinEntry + key;
    if (entry.length < 4) {
      set({ pinEntry: entry, pinError: '' });
      return;
    }

    set({ pinEntry: entry });
    api
      .post<{ ok: boolean; error?: string }>('/api/pin/verify', { pin: entry })
      .then((result) => {
        if (result.ok) {
          set({ view: 'parent', parentTab: 'songs', pinEntry: '', pinError: '' });
        } else {
          set({ pinEntry: '', pinError: 'That PIN did not match. Try again.' });
        }
      })
      .catch((err) => {
        const message =
          err instanceof ApiError && err.status === 429
            ? 'Too many attempts. Try again shortly.'
            : 'Could not reach the jukebox server.';
        set({ pinEntry: '', pinError: message });
      });
  },

  // An admin session has no kid screen to return to - re-lock to the PIN
  // screen instead (still clearing the entry either way).
  exitPin: () => set((s) => ({ view: s.isAdmin ? 'pin' : 'kid', pinEntry: '', pinError: '' })),
  exitParent: () => set((s) => ({ view: s.isAdmin ? 'pin' : 'kid' })),
  setParentTab: (parentTab) => set({ parentTab }),

  flash: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => set({ toast: '' }), 2200);
  },
}));
