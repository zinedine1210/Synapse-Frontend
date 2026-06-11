import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasswordInput, getPasswordStrength } from './PasswordInput';

describe('getPasswordStrength', () => {
  it('returns "weak" for empty string', () => {
    expect(getPasswordStrength('')).toBe('weak');
  });

  it('returns "weak" for short passwords (less than 6 chars)', () => {
    expect(getPasswordStrength('abc')).toBe('weak');
    expect(getPasswordStrength('12345')).toBe('weak');
  });

  it('returns "weak" for 6+ chars with only one character type', () => {
    expect(getPasswordStrength('abcdefgh')).toBe('weak');
    expect(getPasswordStrength('12345678')).toBe('weak');
  });

  it('returns "medium" for 6+ chars with 2 character types', () => {
    expect(getPasswordStrength('abc123')).toBe('medium');
    expect(getPasswordStrength('Hello1')).toBe('medium');
  });

  it('returns "strong" for 8+ chars with 3+ character types', () => {
    expect(getPasswordStrength('Hello123')).toBe('strong');
    expect(getPasswordStrength('Pass!word1')).toBe('strong');
    expect(getPasswordStrength('abcD12!@')).toBe('strong');
  });
});

describe('PasswordInput', () => {
  it('renders with password type by default', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles to text type when eye button is clicked', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const toggleBtn = screen.getByLabelText('Tampilkan password');
    fireEvent.click(toggleBtn);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to password type on second click', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const toggleBtn = screen.getByLabelText('Tampilkan password');
    fireEvent.click(toggleBtn);
    const hideBtn = screen.getByLabelText('Sembunyikan password');
    fireEvent.click(hideBtn);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when user types', () => {
    const handleChange = vi.fn();
    render(<PasswordInput value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('••••••••');
    fireEvent.change(input, { target: { value: 'newpass' } });
    expect(handleChange).toHaveBeenCalledWith('newpass');
  });

  it('renders label via FormField wrapper', () => {
    render(<PasswordInput value="" onChange={() => {}} label="Password" />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders error message via FormField wrapper', () => {
    render(<PasswordInput value="" onChange={() => {}} error="Password required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Password required');
  });

  it('renders hint text via FormField wrapper', () => {
    render(<PasswordInput value="" onChange={() => {}} hint="Min 8 characters" />);
    expect(screen.getByText('Min 8 characters')).toBeInTheDocument();
  });

  it('does not show strength indicator when showStrength is false', () => {
    render(<PasswordInput value="Hello123" onChange={() => {}} />);
    expect(screen.queryByText('Kuat')).not.toBeInTheDocument();
  });

  it('shows strength indicator when showStrength is true and value exists', () => {
    render(<PasswordInput value="Hello123" onChange={() => {}} showStrength />);
    expect(screen.getByText('Kuat')).toBeInTheDocument();
  });

  it('shows "Lemah" for weak passwords with showStrength', () => {
    render(<PasswordInput value="abc" onChange={() => {}} showStrength />);
    expect(screen.getByText('Lemah')).toBeInTheDocument();
  });

  it('shows "Sedang" for medium passwords with showStrength', () => {
    render(<PasswordInput value="abc123" onChange={() => {}} showStrength />);
    expect(screen.getByText('Sedang')).toBeInTheDocument();
  });

  it('does not show strength indicator when value is empty', () => {
    render(<PasswordInput value="" onChange={() => {}} showStrength />);
    expect(screen.queryByText('Lemah')).not.toBeInTheDocument();
    expect(screen.queryByText('Sedang')).not.toBeInTheDocument();
    expect(screen.queryByText('Kuat')).not.toBeInTheDocument();
  });

  it('renders required asterisk when required is true', () => {
    render(<PasswordInput value="" onChange={() => {}} label="Password" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
