import React, { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

let gradientModule: (typeof import('expo-linear-gradient')) | null | undefined;

async function loadGradientModule() {
  if (gradientModule === undefined) {
    try {
      gradientModule = await import('expo-linear-gradient');
    } catch (error) {
      console.warn('[gradient] expo-linear-gradient unavailable, falling back to solid color', error);
      gradientModule = null;
    }
  }
  return gradientModule;
}

interface GradientContainerProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GradientContainer({ colors, start, end, locations, style, children }: GradientContainerProps) {
  const [LinearGradient, setLinearGradient] = useState<null | ((typeof import('expo-linear-gradient'))['LinearGradient'])>(
    () => (gradientModule ? gradientModule.LinearGradient : null),
  );

  useEffect(() => {
    if (!LinearGradient) {
      void loadGradientModule().then((mod) => {
        if (mod?.LinearGradient) {
          setLinearGradient(() => mod.LinearGradient);
        }
      });
    }
  }, [LinearGradient]);

  if (LinearGradient) {
    const Component = LinearGradient;
    return (
      <Component colors={colors} start={start} end={end} locations={locations} style={style}>
        {children}
      </Component>
    );
  }

  return <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>;
}
