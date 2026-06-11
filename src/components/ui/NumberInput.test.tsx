import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NumberInput } from './NumberInput';

describe('NumberInput', () => {
  it('renders with label', () => {
    render(<NumberInput label="Amount" value="" onChange={() => {}} />);
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    render(<NumberInput value="" onChange={() => {}} placeholder="0" />);
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
  });

  it('calls onChange with numeric string', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123' } });
    expect(handleChange).toHaveBeenCalledWith('123');
  });

  it('rejects non-numeric input', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="5" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('allows clearing the input (empty string)', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="42" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('allows decimal input when allowDecimal is true', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="" onChange={handleChange} allowDecimal />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '3.14' } });
    expect(handleChange).toHaveBeenCalledWith('3.14');
  });

  it('rejects decimal input when allowDecimal is false (default)', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="3" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '3.14' } });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('enforces min value', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="5" onChange={handleChange} min={0} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '-1' } });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('enforces max value', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="99" onChange={handleChange} max={100} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '101' } });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('increments value on ArrowUp key', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="5" onChange={handleChange} step={1} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(handleChange).toHaveBeenCalledWith('6');
  });

  it('decrements value on ArrowDown key', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="5" onChange={handleChange} step={1} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(handleChange).toHaveBeenCalledWith('4');
  });

  it('does not decrement below min on ArrowDown', () => {
    const handleChange = vi.fn();
    render(<NumberInput value="0" onChange={handleChange} min={0} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('displays error message', () => {
    render(<NumberInput value="" onChange={() => {}} error="Must be a number" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Must be a number');
  });

  it('applies focus styling on focus', () => {
    render(<NumberInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(input.style.borderColor).toBe('rgba(var(--color-primary) / 0.5)');
  });

  it('renders as disabled', () => {
    render(<NumberInput value="" onChange={() => {}} disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('sets inputMode to numeric by default', () => {
    render(<NumberInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('sets inputMode to decimal when allowDecimal is true', () => {
    render(<NumberInput value="" onChange={() => {}} allowDecimal />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputmode', 'decimal');
  });

  it('applies transition-all 150ms ease for smooth animation', () => {
    render(<NumberInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input.style.transition).toBe('all 150ms ease');
  });

  it('renders full width for responsive layout', () => {
    render(<NumberInput value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input.style.width).toBe('100%');
  });
});
