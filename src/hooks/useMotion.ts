import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMemory } from './useMemory';
export function useMotion() {
  const { data } = useMemory();
  const [systemReduced, setSystemReduced] = useState(true);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setSystemReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduced,
    );
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  return !systemReduced && !data.settings.reduceAnimations;
}
