"use client";

import { Minus, Plus } from "lucide-react";

export function StatStepper({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stat-stepper">
      <span>{label}</span>
      <div>
        <button type="button" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)}>
          <Minus size={13} />
        </button>
        <input
          aria-label={label}
          disabled={disabled}
          inputMode="numeric"
          min={0}
          type="number"
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
        />
        <button type="button" disabled={disabled} onClick={() => onChange(value + 1)}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
