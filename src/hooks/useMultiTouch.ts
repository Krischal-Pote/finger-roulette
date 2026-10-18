import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { ComponentRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

import { PALETTE } from '../constants';
import type { Finger } from '../types';

/** The native handle behind a `<View>`: what `measureInWindow` lives on. */
export type SurfaceHandle = ComponentRef<typeof View>;

/** Fingers slightly outside the surface still count, so edge presses don't flicker away. */
const BOUNDS_PADDING = 24;

/**
 * Tracks every finger resting on one view at the same time.
 *
 * React Native hands us `nativeEvent.touches` (all active touches on the screen,
 * each with `identifier` / `pageX` / `pageY`) on every touch event on both iOS
 * and Android, so a plain `<View>` is enough for multi-finger input - no extra
 * gesture library needed. The list is rebuilt from scratch on every event, so
 * lifting a finger simply makes it disappear.
 *
 * `pageX`/`pageY` are screen coordinates, so the surface's own offset is
 * measured once (and again on every layout change) and subtracted. Touches that
 * land outside the surface - the bill field or the settings button in the header
 * - are ignored.
 */
export function useMultiTouch(enabled: boolean) {
  const surfaceRef = useRef<SurfaceHandle | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  /** Colour + label held per touch id for as long as the finger stays down. */
  const metaRef = useRef<Map<number, { color: string; order: number }>>(
    new Map(),
  );
  const orderRef = useRef(0);
  const [fingers, setFingers] = useState<Finger[]>([]);

  const measureSurface = useCallback(() => {
    surfaceRef.current?.measureInWindow((x, y, width, height) => {
      originRef.current = { x, y };
      sizeRef.current = { width, height };
    });
  }, []);

  useEffect(() => {
    measureSurface();
  }, [measureSurface]);

  const handleTouch = useCallback(
    (event: GestureResponderEvent) => {
      if (!enabled) {
        return;
      }

      const origin = originRef.current;
      const size = sizeRef.current;
      const meta = metaRef.current;
      const seen = new Set<number>();
      const next: Finger[] = [];

      for (const touch of event.nativeEvent.touches) {
        const x = touch.pageX - origin.x;
        const y = touch.pageY - origin.y;

        const outside =
          size.width > 0 &&
          (x < -BOUNDS_PADDING ||
            y < -BOUNDS_PADDING ||
            x > size.width + BOUNDS_PADDING ||
            y > size.height + BOUNDS_PADDING);
        if (outside) {
          continue;
        }

        let info = meta.get(touch.identifier);
        if (!info) {
          orderRef.current += 1;
          info = {
            color: PALETTE[(orderRef.current - 1) % PALETTE.length],
            order: orderRef.current,
          };
          meta.set(touch.identifier, info);
        }

        seen.add(touch.identifier);
        next.push({
          id: touch.identifier,
          x,
          y,
          color: info.color,
          order: info.order,
        });
      }

      if (next.length === 0) {
        // Hand is off the screen: next round starts again at #1.
        meta.clear();
        orderRef.current = 0;
      } else {
        for (const id of Array.from(meta.keys())) {
          if (!seen.has(id)) {
            meta.delete(id);
          }
        }
        next.sort((a, b) => a.order - b.order);
      }

      setFingers(next);
    },
    [enabled],
  );

  const resetFingers = useCallback(() => {
    metaRef.current.clear();
    orderRef.current = 0;
    setFingers([]);
  }, []);

  const touchHandlers = useMemo(
    () => ({
      onTouchStart: handleTouch,
      onTouchMove: handleTouch,
      onTouchEnd: handleTouch,
      onTouchCancel: handleTouch,
    }),
    [handleTouch],
  );

  return { fingers, surfaceRef, measureSurface, resetFingers, touchHandlers };
}
