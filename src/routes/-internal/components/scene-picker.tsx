import { cn } from "#lib/utils";

import { WEDDING_SCENES } from "../services/scenes.ts";

interface ScenePickerProperties {
  value: string;
  onChange: (value: string) => void;
}

export function ScenePicker({ value, onChange }: ScenePickerProperties) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {WEDDING_SCENES.map((scene) => {
        const isActive = scene.id === value;
        return (
          <button
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
            )}
            key={scene.id}
            onClick={() => {
              onChange(scene.id);
            }}
            type="button"
          >
            <span className="block text-sm font-medium">{scene.name}</span>
            <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
              {scene.tagline}
            </span>
          </button>
        );
      })}
    </div>
  );
}
