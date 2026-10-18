import { useEffect, useRef } from "react";
type Props = {
  displayValue: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
};
/** Preserve the user's decimal separator while editing; normalize only on blur. */
export function DecimalInput({
  displayValue,
  onValueChange,
  ariaLabel,
  placeholder,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current)
      ref.current.value = displayValue;
  }, [displayValue]);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      defaultValue={displayValue}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={(event) => {
        event.target.value = displayValue;
      }}
    />
  );
}
