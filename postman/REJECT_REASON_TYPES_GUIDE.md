# Pandit Booking Reject Reason Types - Supported Variations

## Problem Fixed ✅
App was sending `reason_personal` but backend only accepted `unavailable_personal`. 

**Solution:** Backend now intelligently normalizes all reasonType variations and maps them to correct internal values.

---

## Supported Reason Types & Their Variations

### 1. Time Slot Already Booked
**Internal Value:** `time_slot_already_booked`

**Accepted App Variations:**
- `time_slot_already_booked`
- `time_slot`
- `slot_booked`
- `time_slot_booked`
- `time_slot_is_booked`
- `already_booked`
- `slot_already_booked`
- `reason_slot`
- `slot_reason`

**Example:**
```json
{
  "reasonType": "slot_booked",
  "note": "Already have another booking at this time"
}
```

---

### 2. Location Too Far
**Internal Value:** `location_too_far`

**Accepted App Variations:**
- `location_too_far`
- `location_far`
- `location_is_too_far`
- `far`
- `reason_location`
- `location_reason`
- `distance_too_far`
- `too_far`

**Example:**
```json
{
  "reasonType": "distance_too_far",
  "note": "Location is 50km away from my place"
}
```

---

### 3. Pooja Not Performed
**Internal Value:** `pooja_not_performed`

**Accepted App Variations:**
- `pooja_not_performed`
- `not_performed`
- `pooja_not_done`
- `not_my_pooja`
- `reason_pooja`
- `pooja_reason`
- `cant_perform_pooja`
- `cannot_perform`

**Example:**
```json
{
  "reasonType": "cant_perform_pooja",
  "note": "I don't perform this specific ritual"
}
```

---

### 4. Unavailable (Personal)
**Internal Value:** `unavailable_personal`

**Accepted App Variations:**
- `unavailable_personal` ✅ Original
- `personal`
- `unavailable`
- `not_available`
- `reason_personal` ✅ Now works!
- `personal_reason`
- `personal_issue`
- `personal_reasons`
- `not_feeling_well`
- `health_issue`

**Example (What the app was sending):**
```json
{
  "reasonType": "reason_personal",
  "note": "Booking rejected by Pandit."
}
```
✅ This now works!

---

### 5. Other (Custom Reason)
**Internal Value:** `other`

**Accepted App Variations:**
- `other`

**Note:** When using `other`, you MUST provide `otherReason` field:

**Example:**
```json
{
  "reasonType": "other",
  "otherReason": "Emergency work came up",
  "note": "Will be available next week"
}
```

---

## Complete Request Examples

### Example 1: Reject with Time Slot Reason
```bash
curl -X PATCH http://localhost:8000/api/booking-details/bookings/BOOKING_ID/reject \
  -H "Authorization: Bearer PANDIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reasonType": "slot_booked",
    "note": "Already committed to another client"
  }'
```

### Example 2: Reject with Personal Reason (App's Format)
```bash
curl -X PATCH http://localhost:8000/api/booking-details/bookings/BOOKING_ID/reject \
  -H "Authorization: Bearer PANDIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reasonType": "reason_personal",
    "note": "Booking rejected by Pandit."
  }'
```

### Example 3: Reject with Custom Reason
```bash
curl -X PATCH http://localhost:8000/api/booking-details/bookings/BOOKING_ID/reject \
  -H "Authorization: Bearer PANDIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reasonType": "other",
    "otherReason": "Emergency family matter",
    "note": "Will contact user about future bookings"
  }'
```

---

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Appointment rejected successfully",
  "data": {
    "_id": "booking_id",
    "bookingStatus": "cancelled",
    "panditDecision": {
      "rejectReasonType": "unavailable_personal",
      "rejectReasonText": "",
      "note": "Booking rejected by Pandit.",
      "decidedAt": "2026-05-21T10:30:00.000Z"
    }
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "reasonType is required. Allowed values: time_slot_already_booked, location_too_far, pooja_not_performed, unavailable_personal, other"
}
```

---

## How Normalization Works

The backend intelligently normalizes the `reasonType` by:

1. **Converting to lowercase** - `REASON_PERSONAL` → `reason_personal`
2. **Removing special characters** - `reason@personal` → `reason_personal`
3. **Replacing spaces with underscores** - `reason personal` → `reason_personal`
4. **Mapping to internal values** - `reason_personal` → `unavailable_personal`

This means the app can send values in ANY case and format, and the backend will intelligently understand them!

---

## Backend Version
- **Updated:** May 21, 2026
- **Version:** 2.0 (Enhanced normalization)
- **Status:** ✅ Production Ready

## What Works Now ✅
- ✅ App sends `reason_personal` → Backend maps to `unavailable_personal`
- ✅ App sends `slot_booked` → Backend maps to `time_slot_already_booked`
- ✅ App sends `distance_too_far` → Backend maps to `location_too_far`
- ✅ All variations from app are now supported
- ✅ Case-insensitive (all CAPS, lowercase, mixed works)
- ✅ Special characters ignored automatically
- ✅ Spaces converted to underscores automatically

