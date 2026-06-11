import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('renders with label', () => {
    render(<TextInput label="Username" value="" onChange={() => {}} />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    render(<TextInput value="" onChange={() => {}} placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();
    render(<TextInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalledWith('hello');
  });

  it('displays error message', () => {
    render(<TextInput value="" onChange={() => {}} error="Required field" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('displays hint text when no error', () => {
    render(<TextInput value="" onChange={() => {}} hint="Max 50 chars" />);
    expect(screen.getByText('Max 50 chars')).toBeInTheDocument();
  });

  it('applies error styling to input when error is present', () => {
    render(<TextInput value="" onChange={() => {}} error="Error!" />);
    const input = screen.getByRole('textbox');
    expect(input.style.borderColor).toBe('rgb(239, 68, 68)');
  });

  it('applies focus styling on focus', () => {
    render(<TextInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(input.style.borderColor).toBe('rgba(var(--color-primary) / 0.5)');
  });

  it('removes focus styling on blur', () => {
    const handleBlur = vi.fn();
    render(<TextInput value="" onChange={() => {}} onBlur={handleBlur} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.style.borderColor).not.toBe('rgba(var(--color-primary) / 0.5)');
    expect(handleBlur).toHaveBeenCalled();
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<TextInput value="" onChange={() => {}} disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('shows required asterisk', () => {
    render(<TextInput label="Email" value="" onChange={() => {}} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(<TextInput value="" onChange={() => {}} error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies transition-all 150ms ease for smooth animation', () => {
    render(<TextInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input.style.transition).toBe('all 150ms ease');
  });

  it('renders full width for responsive layout', () => {
    render(<TextInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input.style.width).toBe('100%');
  });
});
