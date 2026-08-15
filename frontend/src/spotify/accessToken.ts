import { api } from '../api/client';

interface TokenInfo {
  accessToken: string;
  expiresAt: number;
}

let cached: TokenInfo | null = null;
let pending: Promise<string> | null = null;

// Shared by the Web Playback SDK's getOAuthToken callback and any direct
// frontend -> Spotify calls (play/pause/transfer). Never persisted
// (no localStorage) - held in memory only, refetched from the backend
// (which owns the refresh token) whenever it's missing or close to expiry.
export async function getAccessToken(): Promise<string> {
  const freshEnough = cached && cached.expiresAt > Date.now() + 30_000;
  if (freshEnough) return cached!.accessToken;

  if (!pending) {
    pending = api
      .get<TokenInfo>('/api/spotify/playback-token')
      .then((info) => {
        cached = info;
        return info.accessToken;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
