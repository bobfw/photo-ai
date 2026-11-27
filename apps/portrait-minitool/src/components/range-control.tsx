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
    <div className={disabled ? "control is-disabled" : "control"}>
      <span className="control-label">{label}</span>
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
      <output className="control-value">{display}</output>
    </div>
  );
}
