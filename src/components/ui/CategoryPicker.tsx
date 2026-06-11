'use client';

import React from 'react';

interface CategoryOption {
  id: string;
  label: string;
  emoji?: string;
  color?: string;
}

interface CategoryPickerProps {
  options: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  multiple?: boolean;
  values?: string[];
  onChangeMultiple?: (ids: string[]) => void;
}

export function CategoryPicker({ options, value, onChange, multiple, values = [], onChangeMultiple }: CategoryPickerProps) {
  const handleClick = (id: string) => {
    if (multiple && onChangeMultiple) {
      if (values.includes(id)) {
        onChangeMultiple(values.filter(v => v !== id));
      } else {
        onChangeMultiple([...values, id]);
      }
    } else {
      onChange(value === id ? '' : id);
    }
  };

  const isSelected = (id: string) => multiple ? values.includes(id) : value === id;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => handleClick(opt.id)}
          style={{
            padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: isSelected(opt.id) ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 5,
            background: isSelected(opt.id)
              ? (opt.color ? `${opt.color}20` : 'rgba(var(--color-primary), 0.1)')
              : 'var(--input-bg)',
            color: isSelected(opt.id)
              ? (opt.color || 'rgb(var(--color-primary))')
              : 'inherit',
            transition: 'all 0.2s',
            outline: isSelected(opt.id) ? `2px solid ${opt.color || 'rgb(var(--color-primary))'}` : 'none',
            outlineOffset: -1,
          }}
        >
          {opt.emoji && <span>{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
