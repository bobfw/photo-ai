import { createContext, useContext, type ReactNode } from "react";

interface WeddingEditorContextValue {
  seriesTitle: string;
  pose: number;
}

interface WeddingEditorProviderProperties {
  seriesTitle: string;
  pose: number;
  children: ReactNode;
}

const WeddingEditorContext = createContext<WeddingEditorContextValue | undefined>(undefined);

export function WeddingEditorProvider({
  seriesTitle,
  pose,
  children,
}: WeddingEditorProviderProperties) {
  return (
    <WeddingEditorContext.Provider value={{ seriesTitle, pose }}>
      {children}
    </WeddingEditorContext.Provider>
  );
}

export function useWeddingEditor() {
  const value = useContext(WeddingEditorContext);
  if (!value) throw new Error("缺少 WeddingEditorProvider");
  return value;
}
