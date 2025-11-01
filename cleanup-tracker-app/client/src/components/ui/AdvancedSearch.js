/**
 * Advanced Search & Filtering System
 * Enterprise-grade search with facets, filters, and real-time suggestions
 */

import React, { useState, useCallback } from 'react';

export const AdvancedSearchBar = ({
  onSearch,
  onFilter,
  suggestions = [],
  filters = [],
  placeholder = 'Search...',
}) => {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      onSearch?.(value, activeFilters);
      setShowSuggestions(value.length > 0);
    },
    [activeFilters, onSearch]
  );

  const handleFilterToggle = (filterId, value) => {
    const newFilters = {
      ...activeFilters,
      [filterId]: activeFilters[filterId]?.includes(value)
        ? activeFilters[filterId].filter((v) => v !== value)
        : [...(activeFilters[filterId] || []), value],
    };
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    onFilter?.({});
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <span className="absolute left-4 top-3 text-xl">🔍</span>
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            onFocus={() => {
              setShowSuggestions(query.length > 0);
            }}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-600 focus:outline-none transition-all shadow-sm"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                onSearch?.('', activeFilters);
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(suggestion.text);
                    onSearch?.(suggestion.text, activeFilters);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <span className="text-gray-400">{suggestion.icon || '🔍'}</span>
                  <div>
                    <p className="font-medium text-gray-900">{suggestion.text}</p>
                    {suggestion.category && (
                      <p className="text-xs text-gray-500">{suggestion.category}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="space-y-3">
          {filters.map((filter) => (
            <div key={filter.id}>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                {filter.label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterToggle(filter.id, option.value)}
                    className={`
                      px-4 py-2 rounded-full font-medium text-sm transition-all
                      ${
                        activeFilters[filter.id]?.includes(option.value)
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {option.label}
                    {option.count && (
                      <span className="ml-2 opacity-75">({option.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(activeFilters).some((key) => activeFilters[key]?.length > 0) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SEARCH RESULTS COMPONENT
// ============================================================================

export const SearchResults = ({ results = [], loading = false, error = null }) => {
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <p className="text-red-700 font-semibold">Search Error</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-lg h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🔎</div>
        <p className="text-gray-600 font-semibold">No results found</p>
        <p className="text-gray-500 text-sm">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="text-2xl">{result.icon || '📄'}</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{result.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{result.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {result.tags?.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              {result.date || 'N/A'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// FILTER SIDEBAR
// ============================================================================

export const FilterSidebar = ({ filters = [], onChange, onReset }) => {
  const [activeFilters, setActiveFilters] = useState({});

  const handleChange = (filterId, value) => {
    const updated = { ...activeFilters };
    if (!updated[filterId]) updated[filterId] = [];

    if (updated[filterId].includes(value)) {
      updated[filterId] = updated[filterId].filter((v) => v !== value);
    } else {
      updated[filterId].push(value);
    }

    setActiveFilters(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-6">
      {filters.map((filter) => (
        <div key={filter.id}>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            {filter.icon && <span>{filter.icon}</span>}
            {filter.label}
          </h3>

          <div className="space-y-2">
            {filter.options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={activeFilters[filter.id]?.includes(option.value) || false}
                  onChange={() => handleChange(filter.id, option.value)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {option.label}
                </span>
                {option.count && (
                  <span className="ml-auto text-xs text-gray-500">
                    ({option.count})
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(activeFilters).some((key) => activeFilters[key]?.length > 0) && (
        <button
          onClick={() => {
            setActiveFilters({});
            onReset?.();
          }}
          className="w-full py-2 px-4 text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
};

const AdvancedSearchComponents = {
  AdvancedSearchBar,
  SearchResults,
  FilterSidebar,
};

export default AdvancedSearchComponents;
