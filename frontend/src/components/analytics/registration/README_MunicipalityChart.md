# DavOr Vehicle Registration Rankings - Sorting & Color Guide

## Overview

This document explains how to modify the sorting order and color scheme of the DavOr Vehicle Registration Rankings chart in `MunicipalityChart.jsx`.

## Current Configuration (Lowest to Highest)

- **Sorting**: Municipalities are sorted from lowest to highest vehicle registrations
- **Color Scheme**: Red (lowest) → Yellow (middle) → Blue (highest)

## How to Change Sorting Order

### File Location

`frontend/src/components/analytics/registration/MunicipalityChart.jsx`

### 1. Change Sorting Logic (Line 44)

**Current (Lowest to Highest):**

```javascript
const sortedMunicipalities = [...municipalityData].sort(
  (a, b) => a.vehicles - b.vehicles
);
```

**To Change to Highest to Lowest:**

```javascript
const sortedMunicipalities = [...municipalityData].sort(
  (a, b) => b.vehicles - a.vehicles
);
```

### 2. Update Comment (Line 43)

Update the comment to reflect the new sorting order:

```javascript
// Sort municipalities by vehicle count (descending - highest to lowest) and get top 5
```

## How to Change Color Scheme

### Current Color Logic (Lines 55-103)

The `getBarColor` function assigns colors based on the sorting order:

#### For Lowest-to-Highest Sorting:

- **Index 0-4** (First 5): Red → Orange (lowest performers)
- **Index 5 to totalCount-6**: Yellow (middle performers)
- **Index totalCount-5 to totalCount-1** (Last 5): Blue (highest performers)

#### For Highest-to-Lowest Sorting:

You need to swap the color logic:

```javascript
const getBarColor = (vehicles, index, totalCount) => {
  // Top 5 municipalities: Shades of Blue (highest performers)
  if (index < 5) {
    if (index === 0) {
      return "bg-gradient-to-t from-blue-800 to-blue-600"; // Best performer
    }
    if (index === 1) {
      return "bg-gradient-to-t from-blue-700 to-blue-500"; // Second best
    }
    if (index === 2) {
      return "bg-gradient-to-t from-blue-600 to-blue-400"; // Third
    }
    if (index === 3) {
      return "bg-gradient-to-t from-blue-500 to-blue-300"; // Fourth
    }
    return "bg-gradient-to-t from-blue-400 to-blue-200"; // Fifth
  }

  // Middle municipalities: Shades of Yellow
  if (index >= 5 && index < totalCount - 5) {
    if (index === 5) {
      return "bg-gradient-to-t from-yellow-600 to-yellow-400";
    }
    if (index === 6) {
      return "bg-gradient-to-t from-yellow-500 to-yellow-300";
    }
    return "bg-gradient-to-t from-yellow-400 to-yellow-200";
  }

  // Bottom 5 municipalities: Orange → Red (lowest performers)
  if (index >= totalCount - 5) {
    if (index === totalCount - 1) {
      return "bg-gradient-to-t from-red-600 to-red-400"; // Worst performer
    }
    if (index === totalCount - 2) {
      return "bg-gradient-to-t from-red-500 to-orange-400";
    }
    if (index === totalCount - 3) {
      return "bg-gradient-to-t from-orange-600 to-orange-400";
    }
    if (index === totalCount - 4) {
      return "bg-gradient-to-t from-orange-500 to-orange-300";
    }
    return "bg-gradient-to-t from-orange-400 to-yellow-300"; // Fifth from bottom
  }

  // Default fallback
  return "bg-gradient-to-t from-blue-700 to-blue-500";
};
```

## Quick Reference

### To Switch from Lowest-to-Highest to Highest-to-Lowest:

1. **Change Line 44:**

   ```javascript
   // FROM:
   const sortedMunicipalities = [...municipalityData].sort(
     (a, b) => a.vehicles - b.vehicles
   );
   // TO:
   const sortedMunicipalities = [...municipalityData].sort(
     (a, b) => b.vehicles - a.vehicles
   );
   ```

2. **Update Line 43 comment:**

   ```javascript
   // FROM:
   // Sort municipalities by vehicle count (ascending - lowest to highest) and get top 5
   // TO:
   // Sort municipalities by vehicle count (descending - highest to lowest) and get top 5
   ```

3. **Replace the entire `getBarColor` function (lines 55-103)** with the "For Highest-to-Lowest Sorting" version above.

### To Switch from Highest-to-Lowest to Lowest-to-Highest:

1. **Change Line 44:**

   ```javascript
   // FROM:
   const sortedMunicipalities = [...municipalityData].sort(
     (a, b) => b.vehicles - a.vehicles
   );
   // TO:
   const sortedMunicipalities = [...municipalityData].sort(
     (a, b) => a.vehicles - b.vehicles
   );
   ```

2. **Update Line 43 comment:**

   ```javascript
   // FROM:
   // Sort municipalities by vehicle count (descending - highest to lowest) and get top 5
   // TO:
   // Sort municipalities by vehicle count (ascending - lowest to highest) and get top 5
   ```

3. **Replace the entire `getBarColor` function (lines 55-103)** with the current version in the file (the "For Lowest-to-Highest Sorting" version).

## Color Meanings

- **🔴 Red**: Lowest performers (worst registration numbers)
- **🟡 Yellow**: Middle performers (average registration numbers)
- **🔵 Blue**: Highest performers (best registration numbers)

## Notes

- The chart shows the **top 5** municipalities in the main view
- The "View All" modal shows all municipalities in the same order
- Color gradients provide visual distinction between performance levels
- The `maxValue` calculation remains the same regardless of sorting order
- Bar heights are calculated as percentages of the maximum value

## Testing

After making changes:

1. Refresh the page
2. Check that the leftmost bar shows the correct color for the sorting order
3. Check that the rightmost bar shows the correct color for the sorting order
4. Verify the "View All" modal shows the same color scheme
