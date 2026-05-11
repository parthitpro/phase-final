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
        onBlur={() => setTimeout(() => setIsOpen(false), 250)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="autocomplete-dropdown shadow-xl">
          <div className="dropdown-scroll">
            {filteredOptions.map((opt, idx) => (
              <div 
                key={opt}
                className={`autocomplete-item ${idx === highlightedIndex ? 'highlighted' : ''}`}
                onMouseDown={() => selectOption(opt)}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <div style={{width: '28px', height: '28px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900}}>
                    {opt.charAt(0).toUpperCase()}
                  </div>
                  <span>{opt}</span>
                </div>
              </div>
            ))}
          </div>
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
    <div style={{
      width: '28px', 
      height: '28px', 
      borderRadius: '50%', 
      background: type === 'success' ? 'var(--success)' : 'var(--danger)', 
      color: 'white', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center'
    }}>
      {type === 'success' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{width: 16, height: 16}}><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{width: 16, height: 16}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
    </div>
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
