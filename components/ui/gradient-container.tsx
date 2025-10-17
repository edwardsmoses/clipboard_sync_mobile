import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

interface GradientContainerProps {
  colors: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GradientContainer({ colors, style, children }: GradientContainerProps) {
  const backgroundColor = colors[0] ?? 'transparent';
  return <View style={[style, { backgroundColor }]}>{children}</View>;
}
