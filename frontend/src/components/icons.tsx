export function MusicNoteIcon({ size, opacity = 0.38 }: { size: number; opacity?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      stroke="#e9e9ed"
      strokeOpacity={opacity}
      strokeWidth={14}
      strokeLinecap="round"
    >
      <circle cx="76" cy="188" r="34" />
      <circle cx="196" cy="160" r="34" />
      <path d="M110 188V72l120-28v116" />
    </svg>
  );
}

export function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 4.6c0-1 1.1-1.6 1.9-1.1l10 6.4c.8.5.8 1.7 0 2.2l-10 6.4c-.8.5-1.9-.1-1.9-1.1V4.6Z" />
    </svg>
  );
}

export function PauseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5.5" y="4" width="4.5" height="16" rx="1.6" />
      <rect x="14" y="4" width="4.5" height="16" rx="1.6" />
    </svg>
  );
}

export function SkipIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5.4c0-.9 1-1.4 1.7-1L17 10c.7.4.7 1.4 0 1.8l-9.3 5.7c-.7.4-1.7-.1-1.7-1V5.4Z" />
      <rect x="17.6" y="4.5" width="3" height="15" rx="1.4" />
    </svg>
  );
}

export function StarIcon({
  size,
  filled,
  outlineColor = 'currentColor',
}: {
  size: number;
  filled: boolean;
  outlineColor?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#b5abfc' : 'none'}
      stroke={outlineColor}
      strokeWidth={1.6}
      strokeLinejoin="round"
    >
      <path d="M12 3.2l2.7 5.6 6.1.8-4.4 4.3 1.1 6.1-5.5-3-5.5 3 1.1-6.1L3.2 9.6l6.1-.8L12 3.2Z" />
    </svg>
  );
}

export function ChevronLeftIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}

// Matches the design's "Remove from jukebox"/"Remove from this playlist"/
// queue-remove icon exactly (same path, sizes vary per call site).
export function CloseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronUpIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14l6-6 6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10l6 6 6-6" />
    </svg>
  );
}

export function PencilIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
    </svg>
  );
}
