/**
 * Shared form field interfaces for the Synapse Form Component Library.
 * Used by all form components (TextInput, NumberInput, CurrencyInput, etc.)
 */

export interface FormFieldProps {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input (triggers error styling) */
  error?: string;
  /** Hint/helper text displayed below the input */
  hint?: string;
  /** Whether the field is required (shows asterisk after label) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS class name for the wrapper */
  className?: string;
}
