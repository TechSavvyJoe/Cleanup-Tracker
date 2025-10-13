import React, { useEffect, useRef, useState } from 'react';

const CommandPalette = ({
  open,
  items = [],
  onSelect,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightedIndex(0);
    }
  }, [open]);

  const filteredItems = items.filter((item) => {
    if (!query) return true;
    return item.label.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = filteredItems[highlightedIndex];
        if (item) {
          onSelect?.(item);
        }
      } else if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, highlightedIndex, filteredItems, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" role="presentation" onClick={onClose}>
      <div
        className="command-palette"
        role="listbox"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-palette__header">
          <input
            className="command-palette__search"
            placeholder="Navigate, create, or search…"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="command-palette__list" ref={listRef}>
          {filteredItems.length === 0 && (
            <div className="command-palette__item" aria-disabled>
              No matches found
            </div>
          )}
          {filteredItems.map((item, index) => (
            <div
              key={`${item.type}-${item.value}`}
              className="command-palette__item"
              role="option"
              aria-selected={highlightedIndex === index}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => onSelect?.(item)}
            >
              <span>{item.label}</span>
              {item.badge && <span className="command-palette__badge">{item.badge}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
