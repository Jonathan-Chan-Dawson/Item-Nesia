import { useEffect, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { useMotion } from '../hooks/useMotion';
export function Reveal({ children }: { children: ReactNode }) {
  const motion = useMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!motion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0.6);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [motion, opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}
