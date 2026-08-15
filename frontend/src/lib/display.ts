// Placeholder gradient pairs for album art tiles - used as a fallback while
// real Spotify artwork loads, or for songs with no art at all. Assigned
// deterministically per song (see AlbumArt.tsx), not by array index.
const ART_GRADIENTS: { a: string; b: string }[] = [
  { a: '#4c5397', b: '#262a60' },
  { a: '#5d5294', b: '#2b2741' },
  { a: '#595d6c', b: '#292b31' },
  { a: '#796cbf', b: '#2b2741' },
  { a: '#353b80', b: '#232532' },
  { a: '#75798c', b: '#3f424d' },
];

export function artBackground(artIndex: number): string {
  const { a, b } = ART_GRADIENTS[artIndex % ART_GRADIENTS.length];
  return `radial-gradient(120% 120% at 28% 18%, ${a}, ${b} 72%)`;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
