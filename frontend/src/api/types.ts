export interface ApiSong {
  id: string;
  title: string;
  artist: string;
  durationSecs: number;
  explicit: boolean;
  artUrl: string | null;
  hidden: boolean;
  source: string;
  state: 'allowed' | 'hidden' | 'blocked';
}

export interface ApiKid {
  id: string;
  name: string;
}

export interface ApiQueueEntry {
  id: number;
  song: ApiSong | null;
}

export interface ApiPlaylist {
  id: string;
  name: string;
  owner: string;
  collaborative: boolean;
  linked: boolean;
  songCount: number;
  explicitHiddenCount: number;
  addedCount?: number;
  removedCount?: number;
}

export interface ApiPlaylistSong extends ApiSong {
  chip: 'blocked' | 'removed' | 'in-jukebox';
}

export interface ApiSearchResult {
  id: string;
  title: string;
  artist: string;
  durationSecs: number;
  explicit: boolean;
  artUrl: string | null;
}

export interface ApiSpotifyPlaylistPick {
  id: string;
  name: string;
  owner: string;
  collaborative: boolean;
  trackCount: number;
  linked: boolean;
}

export interface ApiSpotifyStatus {
  connected: boolean;
  displayName: string | null;
  email: string | null;
  device: string | null;
  product: string | null;
}
