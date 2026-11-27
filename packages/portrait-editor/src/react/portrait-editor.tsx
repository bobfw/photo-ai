import { useState, type CSSProperties } from "react";

import { PortraitStage } from "./portrait-stage.tsx";
import type { PortraitEditorPlugin } from "./types.ts";

interface PortraitEditorProperties {
  plugins: PortraitEditorPlugin[];
  defaultPluginId?: string;
  interactive?: boolean;
  checkerboard?: CSSProperties;
  className?: string;
}

export function PortraitEditor({
  plugins,
  defaultPluginId,
  interactive = false,
  checkerboard,
  className,
}: PortraitEditorProperties) {
  const firstPluginId = plugins.length > 0 ? plugins[0].id : "";
  const [activeId, setActiveId] = useState(defaultPluginId ?? firstPluginId);
  const active = plugins.some((plugin) => plugin.id === activeId) ? activeId : firstPluginId;

  return (
    <div className={className}>
      <PortraitStage checkerboard={checkerboard} interactive={interactive}>
        {plugins.map((plugin) => {
          const StageOverlay = plugin.renderStage;
          return StageOverlay ? <StageOverlay key={plugin.id} /> : undefined;
        })}
      </PortraitStage>

      <div aria-label="编辑步骤" className="border-border mt-3 flex border-b" role="tablist">
        {plugins.map((plugin) => {
          const isActive = plugin.id === active;
          return (
            <button
              aria-controls={`panel-${plugin.id}`}
              aria-selected={isActive}
              className={`relative h-11 flex-1 border-0 bg-transparent text-sm transition-colors active:opacity-70 motion-reduce:transition-none ${
                isActive
                  ? "text-foreground after:bg-primary font-semibold after:absolute after:bottom-0 after:left-1/2 after:h-[3px] after:w-5 after:-translate-x-1/2 after:rounded-[2px] after:content-['']"
                  : "text-muted-foreground font-medium"
              }`}
              id={`tab-${plugin.id}`}
              key={plugin.id}
              onClick={() => {
                setActiveId(plugin.id);
              }}
              role="tab"
              type="button"
            >
              {plugin.label}
            </button>
          );
        })}
      </div>

      <div className="border-border bg-card mt-3 rounded-[16px] border p-4">
        {plugins.map((plugin) => {
          const Panel = plugin.panel;
          return (
            <section
              aria-labelledby={`tab-${plugin.id}`}
              className="min-w-0"
              hidden={plugin.id !== active}
              id={`panel-${plugin.id}`}
              key={plugin.id}
              role="tabpanel"
            >
              <Panel />
            </section>
          );
        })}
      </div>
    </div>
  );
}
