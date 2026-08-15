import { useState, type CSSProperties, type ReactNode } from 'react';
import { artBackground } from '../lib/display';
import { MusicNoteIcon } from './icons';

// No stable "art index" exists for real Spotify tracks the way the mock
// catalog had one, so the gradient fallback (shown while artUrl is null, or
// if the image 404s) is chosen deterministically from the song id instead -
// same song always gets the same gradient, still round-robins across the 6.
function hashGradientIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 6;
}

interface AlbumArtProps {
  song: { id: string; artUrl: string | null };
  iconSize: number;
  iconOpacity?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export default function AlbumArt({ song, iconSize, iconOpacity, className, style, children }: AlbumArtProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!song.artUrl && !failed;

  return (
    <div
      className={className}
      style={{ ...style, background: showImage ? undefined : artBackground(hashGradientIndex(song.id)) }}
    >
      {showImage ? (
        <img
          src={song.artUrl!}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <MusicNoteIcon size={iconSize} opacity={iconOpacity} />
      )}
      {children}
    </div>
  );
}
