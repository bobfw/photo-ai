interface RangeControlProperties {
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function RangeControl({
  label,
  value,
  min,
  max,
  display,
  disabled = false,
  onChange,
}: RangeControlProperties) {
  return (
    <div className="mt-2 flex min-w-0 items-center first:mt-0">
      <span className={`mr-2 w-14 shrink-0 text-[13px] ${disabled ? "opacity-40" : ""}`}>
        {label}
      </span>
      <input
        aria-label={label}
        className="[&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary focus:outline-primary m-0 h-11 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent p-0 focus:outline focus:outline-2 focus:outline-offset-2 disabled:opacity-40 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-[2px] [&::-webkit-slider-thumb]:-mt-[9px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        type="range"
        value={value}
      />
      <output
        className={`text-muted-foreground ml-2 w-10 shrink-0 text-right text-xs tabular-nums ${
          disabled ? "opacity-40" : ""
        }`}
      >
        {display}
      </output>
    </div>
  );
}
