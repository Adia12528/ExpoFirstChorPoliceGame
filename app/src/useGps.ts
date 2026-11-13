import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { destination, dist, LatLon } from './geo';

export interface Fix extends LatLon {
  acc: number;
  /** device clock when the fix arrived — used to avoid re-sending dead GPS data */
  recv: number;
  /** speed in m/s if available */
  speed?: number | null;
  /** heading in degrees if available */
  heading?: number | null;
}
export type Perm = 'unknown' | 'granted' | 'denied';

// Where fake-GPS players start (anywhere works; everyone starts within ~10 m of each other).
const FAKE_BASE: LatLon = { lat: 28.6139, lon: 77.209 };

/**
 * 1D Exponential Moving Average (EMA) smoothing for coordinates.
 * Dynamic smoothing factor alpha:
 * - Better accuracy (low acc in meters) => higher weight to new reading (alpha closer to 0.7).
 * - Poor accuracy (high acc) => lower weight to avoid jittery jumps (alpha closer to 0.25).
 */
function smoothCoordinate(prev: number, curr: number, acc: number): number {
  const normalizedAcc = Math.max(3, Math.min(acc, 40));
  // alpha ranges from 0.75 (at 3m accuracy) down to 0.25 (at 40m accuracy)
  const alpha = 0.75 - ((normalizedAcc - 3) / 37) * 0.5;
  return prev + alpha * (curr - prev);
}

export function useGps(enabled: boolean, fake: boolean) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [perm, setPerm] = useState<Perm>('unknown');
  const fixRef = useRef<Fix | null>(null);
  const fakePos = useRef<LatLon>(destination(FAKE_BASE, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16));

  // Ref to track last valid filtered fix for Kalman/EMA smoothing
  const lastFilteredPos = useRef<{ lat: number; lon: number; acc: number; time: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      fixRef.current = null;
      lastFilteredPos.current = null;
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
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 800,
            distanceInterval: 0,
          },
          (loc) => {
            const rawLat = loc.coords.latitude;
            const rawLon = loc.coords.longitude;
            const rawAcc = loc.coords.accuracy ?? 35;
            const now = Date.now();

            // 1. Extreme Outlier rejection: reject fixes with accuracy > 45m if we already have a fix
            if (rawAcc > 45 && lastFilteredPos.current) {
              return;
            }

            // 2. Velocity-based teleport check:
            // Max human sprint ~10 m/s (~36 km/h). If distance jumped exceeds realistic movement in time elapsed, clamp it.
            let finalLat = rawLat;
            let finalLon = rawLon;

            if (lastFilteredPos.current) {
              const prev = lastFilteredPos.current;
              const dtSec = Math.max(0.5, (now - prev.time) / 1000);
              const jumpDist = dist({ lat: prev.lat, lon: prev.lon }, { lat: rawLat, lon: rawLon });
              const impliedSpeed = jumpDist / dtSec; // m/s

              // If jump is unrealistically fast (> 18 m/s, ~65 km/h on foot), it's a GPS multipath glitch
              if (impliedSpeed > 18 && rawAcc > 15) {
                // Reject sudden wild jump
                return;
              }

              // Apply adaptive EMA smoothing to eliminate 1-meter micro-jitter
              finalLat = smoothCoordinate(prev.lat, rawLat, rawAcc);
              finalLon = smoothCoordinate(prev.lon, rawLon, rawAcc);
            }

            lastFilteredPos.current = { lat: finalLat, lon: finalLon, acc: rawAcc, time: now };

            const f: Fix = {
              lat: finalLat,
              lon: finalLon,
              acc: rawAcc,
              recv: now,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
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
