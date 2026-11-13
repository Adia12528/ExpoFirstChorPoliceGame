import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { destination, LatLon } from './geo';

export interface Fix extends LatLon {
  acc: number;
  /** device clock when the fix arrived — used to avoid re-sending dead GPS data */
  recv: number;
}
export type Perm = 'unknown' | 'granted' | 'denied';

// Where fake-GPS players start (anywhere works; everyone starts within ~10 m of each other).
const FAKE_BASE: LatLon = { lat: 28.6139, lon: 77.209 };

export function useGps(enabled: boolean, fake: boolean) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [perm, setPerm] = useState<Perm>('unknown');
  const fixRef = useRef<Fix | null>(null);
  const fakePos = useRef<LatLon>(destination(FAKE_BASE, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16));

  useEffect(() => {
    if (!enabled) {
      fixRef.current = null;
      setFix(null);
      return;
    }
    if (fake) {
      setPerm('granted');
      const id = setInterval(() => {
        const f: Fix = { ...fakePos.current, acc: 5, recv: Date.now() };
        fixRef.current = f;
        setFix(f);
      }, 1000);
      return () => clearInterval(id);
    }

    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const r = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (r.status !== 'granted') {
          setPerm('denied');
          return;
        }
        setPerm('granted');
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
          (loc) => {
            const f: Fix = {
              lat: loc.coords.latitude,
              lon: loc.coords.longitude,
              acc: loc.coords.accuracy ?? 50,
              recv: Date.now(),
            };
            fixRef.current = f;
            setFix(f);
          },
        );
        if (cancelled) s.remove();
        else sub = s;
      } catch {
        if (!cancelled) setPerm('denied');
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, fake]);

  /** fake-GPS test mode: walk the phantom player by dx (east) / dy (north) metres */
  const fakeMove = useCallback((dx: number, dy: number) => {
    fakePos.current = destination(fakePos.current, dx, dy);
  }, []);

  return { fix, fixRef, perm, fakeMove };
}
