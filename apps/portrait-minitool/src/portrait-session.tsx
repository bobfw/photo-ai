import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

import { hasTransparentPixels, loadImageElement } from "./editor.ts";
import type { PortraitKind } from "./types.ts";

export interface PortraitSession {
  source: HTMLImageElement;
  kind: PortraitKind;
  hasAlpha: boolean;
}

interface PortraitSessionValue {
  getSession: () => PortraitSession | undefined;
  loadPortrait: (file: File, kind: PortraitKind) => Promise<PortraitSession>;
}

const PortraitSessionContext = createContext<PortraitSessionValue | undefined>(undefined);

export function PortraitSessionProvider({ children }: { children: ReactNode }) {
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19 useRef requires an initial argument
  const sessionReference = useRef<PortraitSession | undefined>(undefined);
  const objectUrlReference = useRef("");

  useEffect(() => {
    return () => {
      if (objectUrlReference.current) URL.revokeObjectURL(objectUrlReference.current);
    };
  }, []);

  const loadPortrait = useCallback(async (file: File, kind: PortraitKind) => {
    if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");

    const objectUrl = URL.createObjectURL(file);
    try {
      const source = await loadImageElement(objectUrl);
      const next = { source, kind, hasAlpha: hasTransparentPixels(source) };
      if (objectUrlReference.current) URL.revokeObjectURL(objectUrlReference.current);
      objectUrlReference.current = objectUrl;
      sessionReference.current = next;
      return next;
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }, []);

  const getSession = useCallback(() => sessionReference.current, []);

  return (
    <PortraitSessionContext.Provider value={{ getSession, loadPortrait }}>
      {children}
    </PortraitSessionContext.Provider>
  );
}

export function usePortraitSession() {
  const value = useContext(PortraitSessionContext);
  if (!value) throw new Error("缺少 PortraitSessionProvider");
  return value;
}
