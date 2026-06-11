import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormField, formInputStyles, getFormInputStyle } from './FormField';

describe('FormField', () => {
  it('renders children', () => {
    render(
      <FormField>
        <input data-testid="child-input" />
      </FormField>
    );
    expect(screen.getByTestId('child-input')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders required asterisk when required is true', () => {
    render(
      <FormField label="Name" required>
        <input />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not render asterisk when required is false', () => {
    render(
      <FormField label="Name">
        <input />
      </FormField>
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(
      <FormField error="This field is required">
        <input />
      </FormField>
    );
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('This field is required');
  });

  it('renders hint text when hint is provided and no error', () => {
    render(
      <FormField hint="Enter your full name">
        <input />
      </FormField>
    );
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(
      <FormField hint="Some hint" error="Some error">
        <input />
      </FormField>
    );
    expect(screen.queryByText('Some hint')).not.toBeInTheDocument();
    expect(screen.getByText('Some error')).toBeInTheDocument();
  });

  it('applies disabled opacity when disabled is true', () => {
    const { container } = render(
      <FormField disabled>
        <input />
      </FormField>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('0.6');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField className="my-custom-class">
        <input />
      </FormField>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains('my-custom-class')).toBe(true);
  });

  it('associates label with input via htmlFor', () => {
    render(
      <FormField label="Email" htmlFor="email-input">
        <input id="email-input" />
      </FormField>
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('applies error color to label when error is present', () => {
    render(
      <FormField label="Username" error="Required">
        <input />
      </FormField>
    );
    const label = screen.getByText('Username');
    expect(label.style.color).toBe('rgb(var(--color-error))');
  });
});

describe('formInputStyles', () => {
  it('base styles include transition-all 150ms', () => {
    expect(formInputStyles.base.transition).toBe('all 150ms ease');
  });

  it('error styles include red border color', () => {
    expect(formInputStyles.error.borderColor).toBe('rgb(239, 68, 68)');
  });
});

describe('getFormInputStyle', () => {
  it('returns base styles by default', () => {
    const style = getFormInputStyle({});
    expect(style.transition).toBe('all 150ms ease');
    expect(style.borderColor).toBeUndefined();
  });

  it('merges focus styles when isFocused is true', () => {
    const style = getFormInputStyle({ isFocused: true });
    expect(style.borderColor).toBe('rgba(var(--color-primary) / 0.5)');
    expect(style.boxShadow).toBe('0 0 0 3px rgba(var(--color-primary) / 0.1)');
  });

  it('merges error styles when hasError is true', () => {
    const style = getFormInputStyle({ hasError: true });
    expect(style.borderColor).toBe('rgb(239, 68, 68)');
  });

  it('error styles take precedence over focus styles', () => {
    const style = getFormInputStyle({ hasError: true, isFocused: true });
    expect(style.borderColor).toBe('rgb(239, 68, 68)');
  });

  it('merges disabled styles when isDisabled is true', () => {
    const style = getFormInputStyle({ isDisabled: true });
    expect(style.cursor).toBe('not-allowed');
    expect(style.opacity).toBe(0.6);
  });
});
