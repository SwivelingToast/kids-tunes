import type { Response as ExpressResponse } from 'express';
import { getValidAccessToken, SpotifyNotConnectedError } from './tokens.js';

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Spotify API error ${status}: ${body}`);
    this.name = 'SpotifyApiError';
    this.status = status;
  }
}

export async function spotifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  const resp = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new SpotifyApiError(resp.status, await resp.text());
  }
  return resp;
}

export async function spotifyJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await spotifyFetch(path, init);
  return (await resp.json()) as T;
}

interface Paged<T> {
  items: T[];
  next: string | null;
}

// Follows Spotify's `next` cursor (a full URL) until exhausted. `firstPath`
// is relative (e.g. "/me/playlists?limit=50"); subsequent pages replay the
// full URL Spotify hands back, so they go through fetch() directly rather
// than spotifyFetch()'s path-prefixing - the auth header still applies.
export async function spotifyPaginate<T>(firstPath: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `https://api.spotify.com/v1${firstPath}`;
  while (url) {
    const token = await getValidAccessToken();
    const resp: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) throw new SpotifyApiError(resp.status, await resp.text());
    const page = (await resp.json()) as Paged<T>;
    results.push(...page.items);
    url = page.next;
  }
  return results;
}

// Shared error -> HTTP response mapping for routes that call out to
// Spotify - keeps that translation in one place instead of a try/catch
// block per route reinventing it slightly differently.
export function handleSpotifyError(err: unknown, res: ExpressResponse): void {
  if (err instanceof SpotifyNotConnectedError) {
    res.status(400).json({ error: 'Spotify is not connected.' });
    return;
  }
  if (err instanceof SpotifyApiError) {
    res.status(502).json({ error: `Spotify API error: ${err.status}` });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Unexpected error talking to Spotify.' });
}
