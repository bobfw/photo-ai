import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

interface RatioPreset {
  label: string;
  value: number;
  hint?: string;
}

interface BackgroundOptions {
  ratios: readonly RatioPreset[];
  hasAlpha: boolean;
  checkerboard: CSSProperties;
}

interface BackgroundOptionsProviderProperties {
  ratios: readonly RatioPreset[];
  hasAlpha: boolean;
  checkerboard: CSSProperties;
  children: ReactNode;
}

const BackgroundOptionsContext = createContext<BackgroundOptions | undefined>(undefined);

export function BackgroundOptionsProvider({
  ratios,
  hasAlpha,
  checkerboard,
  children,
}: BackgroundOptionsProviderProperties) {
  return (
    <BackgroundOptionsContext.Provider value={{ hasAlpha, checkerboard, ratios }}>
      {children}
    </BackgroundOptionsContext.Provider>
  );
}

export function useBackgroundOptions() {
  const value = useContext(BackgroundOptionsContext);
  if (!value) throw new Error("缺少 BackgroundOptionsProvider");
  return value;
}
