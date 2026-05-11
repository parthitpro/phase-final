import React, { useState, useMemo } from 'react';

export const SearchableAutocomplete = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder,
  onSelect,
  id
}: { 
  options?: string[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder: string,
  onSelect?: (val: string) => void,
  id?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const filteredOptions = useMemo(() => 
    options.filter(opt => opt.toLowerCase().includes(value.toLowerCase())),
    [options, value]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        selectOption(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectOption = (opt: string) => {
    onChange(opt);
    if (onSelect) onSelect(opt);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="autocomplete-container">
      <input 
        id={id}
        className="styled-input"
        value={value}
        onChange={e => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="autocomplete-dropdown">
          {filteredOptions.map((opt, idx) => (
            <div 
              key={opt}
              className={`autocomplete-item ${idx === highlightedIndex ? 'highlighted' : ''}`}
              onMouseDown={() => selectOption(opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SortIcon = ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => (
  <div className={`sort-icon ${active ? 'active' : ''} ${direction}`}>
    <svg viewBox="0 0 10 6"><path d="M5 0L10 6H0L5 0Z"/></svg>
    <svg viewBox="0 0 10 6" style={{transform: 'rotate(180deg)'}}><path d="M5 0L10 6H0L5 0Z"/></svg>
  </div>
);

export const Toast = ({ message, type }: { message: string, type: 'success' | 'error' }) => (
  <div className="toast">
    <span style={{fontSize: '1.2rem'}}>{type === 'success' ? '✅' : '❌'}</span>
    {message}
  </div>
);

export const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2 style={{marginTop: 0, marginBottom: '0.5rem'}}>{title}</h2>
      <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>{message}</p>
      <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm} style={{background: 'var(--danger)'}}>Confirm</button>
      </div>
    </div>
  </div>
);
