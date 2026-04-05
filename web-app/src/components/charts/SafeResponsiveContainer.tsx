'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

type SafeResponsiveContainerProps = React.ComponentProps<typeof ResponsiveContainer> & {
  fallbackHeight?: number;
};

export default function SafeResponsiveContainer({
  height = 240,
  fallbackHeight = 200,
  children,
  ...rest
}: SafeResponsiveContainerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = hostRef.current;
    if (!host) return;

    const checkSize = () => {
      const width = host.clientWidth;
      const measuredHeight = host.clientHeight;
      setReady(width > 0 && measuredHeight > 0);
    };

    checkSize();
    const observer = new ResizeObserver(checkSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const effectiveHeight = typeof height === 'number' ? height : fallbackHeight;

  return (
    <div ref={hostRef} style={{ width: '100%', minWidth: 1, minHeight: effectiveHeight }}>
      {ready ? (
        <ResponsiveContainer width="100%" height={height} minWidth={1} minHeight={effectiveHeight} {...rest}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div style={{ width: '100%', height: effectiveHeight }} />
      )}
    </div>
  );
}
