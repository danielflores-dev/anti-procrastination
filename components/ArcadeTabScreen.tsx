import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsFocused } from '@react-navigation/native';
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

// Shared across all tabs so each screen knows which side it was entered from.
let lastTabIndex = 0;

type Props = {
  /** Position of this tab in the tab bar, left to right. */
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Wraps a tab screen and plays an arcade-style entrance whenever the tab
 * gains focus: the screen snap-slides in from the direction you moved
 * (home -> work slides in from the right, back again from the left).
 */
export default function ArcadeTabScreen({ index, children, style }: Props) {
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!focused) return;
    const fromIndex = lastTabIndex;
    lastTabIndex = index;
    if (reducedMotion || fromIndex === index) return;

    const direction = index > fromIndex ? 1 : -1;
    translateX.setValue(direction * 42);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [focused, index, reducedMotion, translateX]);

  return (
    <Animated.View style={[{ flex: 1 }, style, { transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}
