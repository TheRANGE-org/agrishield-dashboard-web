import { useState, useEffect, useRef } from "react";

export function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // Debounce or just set immediately
        requestAnimationFrame(() => {
          setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
}
