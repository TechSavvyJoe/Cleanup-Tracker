# X.com Design Implementation Plan

## Issues to Fix:
1. ❌ Sidebar doesn't close properly
2. ❌ Too much scrolling - need compact views
3. ❌ Elements don't look like X.com
4. ❌ Need better information density

## X.com Design Principles:
- Pure black (#000000) background everywhere
- Thin borders (1px, #2F3336 or border-gray-800)
- Minimal padding (p-3, p-4 max)
- Compact layouts with dense information
- Hover states that are subtle (bg-gray-900)
- Single-line items in lists
- Icons on left, text compact
- No gradients, no heavy shadows
- Typography: System font, medium weight

## Implementation:

### 1. Sidebar Fix
- Make it actually disappear when clicked outside
- Smooth animation
- Hamburger visible on all screens

### 2. Compact Views
- Jobs: Show as compact rows with key info only
- Dashboard: Cards side-by-side, minimal height
- Tables: Dense rows, small text, no extra padding

### 3. X.com Component Style
```
Card:
- bg-black border border-gray-800 rounded-xl
- Hover: border-gray-700
- Padding: p-4 max

Button:
- Primary: bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full
- Secondary: border border-gray-700 text-white hover:bg-gray-900 rounded-full

List Item:
- flex items-center justify-between py-3 border-b border-gray-800
- Hover: bg-gray-900

Input:
- bg-black border border-gray-700 text-white rounded-lg px-3 py-2
- Focus: border-blue-500
```
