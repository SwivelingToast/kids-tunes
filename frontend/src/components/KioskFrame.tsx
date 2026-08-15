import { useEffect, useRef, useState, type ReactNode } from 'react';
import './KioskFrame.css';

const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 1280;

// The real target is a fixed 800x1280 kiosk viewport (an 8" Android tablet
// running full-screen). Scaling to fit here is purely so the same fixed
// layout previews sanely on a dev monitor - on the actual tablet the
// available space matches 800x1280 exactly and this resolves to scale 1.
export default function KioskFrame({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const { clientWidth, clientHeight } = container;
      setScale(Math.min(clientWidth / FRAME_WIDTH, clientHeight / FRAME_HEIGHT));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="kiosk-viewport">
      <div
        className="kiosk-frame"
        style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
