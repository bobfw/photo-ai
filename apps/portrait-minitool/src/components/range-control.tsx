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
        className="range m-0 h-11 min-w-0 flex-1 appearance-none bg-transparent p-0"
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
        className={`ml-2 w-10 shrink-0 text-right text-xs tabular-nums text-ink-soft ${
          disabled ? "opacity-40" : ""
        }`}
      >
        {display}
      </output>
    </div>
  );
}
