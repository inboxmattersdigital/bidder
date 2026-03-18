import * as React from "react"
import { cn } from "../../lib/utils"

const NumberInput = React.forwardRef(({ className, value, onChange, min, max, step, placeholder, ...props }, ref) => {
  // Store the display value as string to allow proper editing
  const [displayValue, setDisplayValue] = React.useState(() => {
    if (value === undefined || value === null || value === "") return "";
    return value.toString();
  });
  
  // Track if user is currently editing
  const [isEditing, setIsEditing] = React.useState(false);
  
  // Update display value when external value changes (only when not editing)
  React.useEffect(() => {
    if (!isEditing && value !== undefined && value !== null) {
      setDisplayValue(value.toString());
    }
  }, [value, isEditing]);

  const handleFocus = (e) => {
    setIsEditing(true);
    // Select all text on focus for easy replacement
    e.target.select();
    props.onFocus && props.onFocus(e);
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === "") {
      setDisplayValue("");
      onChange && onChange({ target: { value: "" } });
      return;
    }
    
    // Allow valid number patterns including decimals and negative
    if (/^-?\d*\.?\d*$/.test(inputValue)) {
      setDisplayValue(inputValue);
      
      // Parse and send the numeric value
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange && onChange({ target: { value: numValue } });
      }
    }
  };

  const handleBlur = (e) => {
    setIsEditing(false);
    
    // On blur, clean up the display value
    if (displayValue === "" || displayValue === "-" || displayValue === ".") {
      setDisplayValue("0");
      onChange && onChange({ target: { value: 0 } });
    } else {
      const numValue = parseFloat(displayValue);
      if (!isNaN(numValue)) {
        // Apply min/max constraints
        let finalValue = numValue;
        if (min !== undefined && numValue < min) finalValue = min;
        if (max !== undefined && numValue > max) finalValue = max;
        
        setDisplayValue(finalValue.toString());
        onChange && onChange({ target: { value: finalValue } });
      }
    }
    
    props.onBlur && props.onBlur(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      ref={ref}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder || "0"}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
NumberInput.displayName = "NumberInput"

export { NumberInput }
