export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  duration_ms: number;
  explicit: boolean;
  album: { images: { url: string; width: number; height: number }[] };
}

export interface MappedTrack {
  id: string;
  title: string;
  artist: string;
  durationSecs: number;
  explicit: boolean;
  artUrl: string | null;
}

// Prefer the ~300px variant for tiles (README "Artwork"); Spotify orders
// album.images largest-first, so pick whichever is closest to 300 wide.
function pickArtUrl(images: SpotifyTrack['album']['images']): string | null {
  if (!images?.length) return null;
  const closest = images.reduce((best, img) => (Math.abs(img.width - 300) < Math.abs(best.width - 300) ? img : best));
  return closest.url;
}

export function mapSpotifyTrack(track: SpotifyTrack): MappedTrack {
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    durationSecs: Math.round(track.duration_ms / 1000),
    explicit: track.explicit,
    artUrl: pickArtUrl(track.album?.images ?? []),
  };
}
