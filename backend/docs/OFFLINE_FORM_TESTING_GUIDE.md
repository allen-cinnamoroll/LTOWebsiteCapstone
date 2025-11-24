# Testing Guide: Offline Form Persistence

This guide provides step-by-step instructions for testing the offline form persistence feature in the Add Vehicle Modal.

## Prerequisites
- Application running (frontend and backend)
- Browser with Developer Tools (Chrome, Firefox, Edge, etc.)
- Access to Manage Vehicles page

## Test Scenarios

### ✅ Test 1: Offline Save & Restore

**Steps:**
1. Navigate to Manage Vehicles page
2. Click "Add Vehicle" button
3. Fill in some fields (e.g., Plate No: "ABC123", Make: "Toyota")
4. **Simulate offline**: Open DevTools (F12) → Network tab → Set throttling to "Offline"
5. **Verify**: Yellow banner appears: "⚠️ You're offline..."
6. **Verify**: Toast notification: "You're offline - Your form data will be saved automatically"
7. Continue filling more fields
8. Close the modal
9. **Go back online**: DevTools Network tab → Set throttling to "No throttling"
10. Reopen "Add Vehicle" modal
11. **Expected**: All previously entered data is restored
12. **Expected**: Toast notification: "Unsaved data restored - Your form data from when you were offline has been restored"

**Result**: ✅ Pass / ❌ Fail

---

### ✅ Test 2: Real-Time Offline Detection

**Steps:**
1. Open "Add Vehicle" modal
2. Start typing in any field
3. **While modal is open**: Open DevTools (F12) → Network tab → Set to "Offline"
4. **Verify immediately**: Yellow offline banner appears at top of modal
5. **Verify**: Toast notification about being offline
6. Continue typing (form should still work)
7. **While still open**: Go back online (set Network to "No throttling")
8. **Verify**: Yellow banner disappears
9. **Verify**: Green toast: "You're back online - Your form data has been preserved"

**Result**: ✅ Pass / ❌ Fail

---

### ✅ Test 3: Clear Draft Button

**Steps:**
1. Fill in some fields in "Add Vehicle" modal
2. Close modal (data saved)
3. Reopen modal
4. **Verify**: "Clear Draft" button visible in footer (red, with trash icon)
5. Click "Clear Draft" button
6. **Expected**: All fields reset to empty
7. **Expected**: Toast: "Draft cleared - All unsaved form data has been removed"
8. **Expected**: "Clear Draft" button disappears
9. Close and reopen modal
10. **Expected**: Form is empty (no restored data)

**Result**: ✅ Pass / ❌ Fail

---

### ✅ Test 4: Successful Submission Clears Draft

**Steps:**
1. Fill in valid vehicle data (all required fields)
2. **Optionally**: Go offline and back online to trigger offline save
3. Submit the form successfully
4. **Expected**: Success toast: "Vehicle has been added"
5. Reopen "Add Vehicle" modal
6. **Expected**: Form is completely empty
7. **Expected**: No "Unsaved data restored" notification
8. **Expected**: No "Clear Draft" button

**Result**: ✅ Pass / ❌ Fail

---

### ✅ Test 5: Already Offline When Opening

**Steps:**
1. **Before opening modal**: Go offline (DevTools Network → Offline)
2. Click "Add Vehicle" button
3. **Expected**: Modal opens with yellow offline banner already visible
4. **Expected**: Offline toast notification appears
5. Fill in fields
6. Close modal
7. Go back online
8. Reopen modal
9. **Expected**: Data restored with notification

**Result**: ✅ Pass / ❌ Fail

---

### ✅ Test 6: Multiple Open/Close Cycles

**Steps:**
1. Open modal, fill Field A
2. Close modal
3. Reopen modal → **Verify**: Field A populated
4. Fill Field B
5. Close modal
6. Reopen modal → **Verify**: Fields A & B populated
7. Go offline (Network → Offline)
8. Fill Field C
9. Close modal
10. Go online
11. Reopen modal → **Verify**: All fields A, B, C populated
12. **Verify**: "Unsaved data restored" notification (saved while offline)

**Result**: ✅ Pass / ❌ Fail

---

### ✅ Test 7: No Draft Interference

**Steps:**
1. Open modal with **no** saved draft
2. **Verify**: Form is empty
3. **Verify**: No "Clear Draft" button
4. **Verify**: No "Unsaved data restored" notification
5. Type in one character
6. **Verify**: "Clear Draft" button appears immediately
7. Delete the character (field is empty again)
8. Close and reopen
9. **Verify**: Form is empty, no button

**Result**: ✅ Pass / ❌ Fail

---

## Browser Compatibility Tests

Test the feature across different browsers:

| Browser | Version | Offline Banner | Toasts | Draft Save | Draft Restore | Clear Button |
|---------|---------|----------------|--------|------------|---------------|--------------|
| Chrome  | Latest  | ⬜             | ⬜     | ⬜         | ⬜            | ⬜           |
| Firefox | Latest  | ⬜             | ⬜     | ⬜         | ⬜            | ⬜           |
| Edge    | Latest  | ⬜             | ⬜     | ⬜         | ⬜            | ⬜           |
| Safari  | Latest  | ⬜             | ⬜     | ⬜         | ⬜            | ⬜           |

## How to Simulate Offline Mode

### Method 1: Browser DevTools (Recommended)
1. Press F12 or right-click → Inspect
2. Go to **Network** tab
3. Change throttling dropdown to **Offline**
4. To go back online: Change to **No throttling**

### Method 2: Disable Network Adapter (Real Offline)
**Windows:**
1. Control Panel → Network and Sharing Center
2. Change adapter settings
3. Right-click your network adapter → Disable
4. To reconnect: Right-click → Enable

**Mac:**
1. System Preferences → Network
2. Turn Wi-Fi Off
3. To reconnect: Turn Wi-Fi On

### Method 3: Airplane Mode (Mobile/Laptop)
1. Enable Airplane Mode
2. To reconnect: Disable Airplane Mode

## Common Issues & Troubleshooting

### Issue: Offline banner doesn't appear
- **Check**: Browser console for errors
- **Check**: DevTools Network tab shows "Offline"
- **Try**: Refresh page and try again

### Issue: Data not restored
- **Check**: localStorage in DevTools → Application tab → Local Storage
- **Look for**: `vehicle_form_draft` key
- **Check**: Browser allows localStorage (not in private/incognito mode)

### Issue: Toasts not showing
- **Check**: Browser allows notifications
- **Check**: No console errors
- **Try**: Clear cache and reload

### Issue: Clear Draft button not appearing
- **Check**: Form has at least one field with data
- **Check**: localStorage contains `vehicle_form_draft`
- **Try**: Type something, close modal, reopen

## LocalStorage Inspection

To manually inspect saved data:

1. Open DevTools (F12)
2. Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Click on your site URL
5. Look for these keys:
   - `vehicle_form_draft` - Contains form data
   - `vehicle_form_draft_metadata` - Contains metadata (offline flag, timestamp)

**Example metadata:**
```json
{
  "savedWhileOffline": true,
  "timestamp": "2024-11-20T10:30:45.123Z"
}
```

## Success Criteria

All tests should pass with these results:
- ✅ Offline detection works in real-time
- ✅ Yellow banner appears when offline
- ✅ Appropriate toast notifications at correct times
- ✅ Data saves automatically when offline
- ✅ Data restores correctly on modal reopen
- ✅ Special notification when restoring offline-saved data
- ✅ Clear Draft button appears/disappears correctly
- ✅ Successful submission clears all saved drafts
- ✅ No interference with normal usage when online

## Notes

- This feature is **specifically** for internet disconnection scenarios
- It's designed to be non-intrusive during normal online usage
- Data persists across browser sessions (until manually cleared or successfully submitted)
- The feature works even if the browser is closed and reopened

