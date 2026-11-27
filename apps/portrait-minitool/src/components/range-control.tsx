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
    <div className="control">
      <div className="control-head">
        <span>{label}</span>
        <output>{display}</output>
      </div>
      <input
        aria-label={label}
        className="range"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        type="range"
        value={value}
      />
    </div>
  );
}
