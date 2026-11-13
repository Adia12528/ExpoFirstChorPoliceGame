import { useEffect, useRef, useState } from 'react';
import { Magnetometer } from 'expo-sensors';

export function useCompass(enabled: boolean) {
  const [heading, setHeading] = useState(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;

    try {
      Magnetometer.isAvailableAsync()
        .then((avail) => {
          if (!avail) return;
          Magnetometer.setUpdateInterval(150);
          sub = Magnetometer.addListener((data) => {
            let angle = Math.atan2(-data.x, data.y) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            // Smooth angle transition
            const prev = smoothRef.current;
            let diff = angle - prev;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;
            const next = (prev + diff * 0.25 + 360) % 360;
            smoothRef.current = next;
            setHeading(Math.round(next));
          });
        })
        .catch(() => {});
    } catch {
      // Safe fallback on devices without magnetometer
    }

    return () => {
      sub?.remove();
    };
  }, [enabled]);

  return heading;
}

