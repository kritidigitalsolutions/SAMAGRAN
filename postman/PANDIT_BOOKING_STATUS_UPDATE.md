# Pandit Booking Status Update API Guide

## Overview
Pandit can now manage booking status from their app - confirm, complete, or reject bookings.

---

## Endpoints

### 1. Get All Assigned Bookings
**Endpoint:** `GET /api/booking-details/bookings`

**Authentication:** Required (Pandit JWT Token)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id_here",
      "user": {
        "_id": "user_id",
        "name": "User Name",
        "phone": "9876543210",
        "email": "user@example.com",
        "profileImage": "url"
      },
      "pandit": "pandit_id",
      "ritualRef": {
        "_id": "ritual_id",
        "title": "Stya Narayan Pooja",
        "description": "...",
        "image": "url",
        "durationHours": 2
      },
      "bookingStatus": "requested",
      "bookingDate": "2026-05-23",
      "bookingSlot": "10:00 AM - 12:00 PM",
      "amount": 499,
      "paymentStatus": "completed"
    }
  ]
}
```

---

### 2. Confirm/Approve Booking
**Endpoint:** `PATCH /api/booking-details/bookings/:bookingId/approve`

**Authentication:** Required (Pandit JWT Token)

**Request Body:**
```json
{
  "samagriType": "standard",
  "note": "I will provide standard pooja samagri"
}
```

**samagriType Options:**
- `standard` - Using standard ritual items
- `customize` - Using custom ritual items

**Response:**
```json
{
  "success": true,
  "message": "Appointment approved successfully",
  "data": {
    "_id": "booking_id",
    "bookingStatus": "confirmed",
    "panditDecision": {
      "samagriType": "standard",
      "note": "I will provide standard pooja samagri",
      "decidedAt": "2026-05-21T10:00:00Z"
    }
  }
}
```

**Status Change:** `requested` → `confirmed`

---

### 3. Complete Booking
**Endpoint:** `PATCH /api/booking-details/bookings/:bookingId/complete`

**Authentication:** Required (Pandit JWT Token)

**Request Body:**
```json
{
  "completionNote": "Pooja completed successfully. User was very happy."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking marked as completed successfully",
  "data": {
    "_id": "booking_id",
    "bookingStatus": "completed",
    "completedAt": "2026-05-23T12:30:00Z",
    "notes": "Completion note: Pooja completed successfully. User was very happy."
  }
}
```

**Status Change:** `confirmed` → `completed`

---

### 4. Reject/Cancel Booking
**Endpoint:** `PATCH /api/booking-details/bookings/:bookingId/reject`

**Authentication:** Required (Pandit JWT Token)

**Request Body:**
```json
{
  "reasonType": "time_slot_already_booked",
  "note": "Already have another booking at this time"
}
```

**reasonType Options:**
- `time_slot_already_booked`
- `location_too_far`
- `pooja_not_performed`
- `unavailable_personal`
- `other` (requires otherReason field)

**With Custom Reason:**
```json
{
  "reasonType": "other",
  "otherReason": "Health issue on that day"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment rejected successfully",
  "data": {
    "_id": "booking_id",
    "bookingStatus": "cancelled",
    "panditDecision": {
      "rejectReasonType": "time_slot_already_booked",
      "note": "Already have another booking at this time"
    }
  }
}
```

**Status Change:** `requested` → `cancelled`

---

## Booking Status Flow

```
User Books Pooja
        ↓
    [requested] ← Pending pandit confirmation
        ↓
    [confirmed] ← Pandit approved (via /approve)
        ↓
    [completed] ← Pandit marked as done (via /complete)

OR

    [requested]
        ↓
    [cancelled] ← Pandit rejected (via /reject)
```

---

## Implementation Steps for Pandit App

### Step 1: Get Bookings List
```javascript
// On app load, fetch all assigned bookings
const response = await fetch('/api/booking-details/bookings', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${panditToken}`
  }
});
const bookings = await response.json();
```

### Step 2: Show Bookings in App
- Display each booking with status badge
- Show user details, ritual info, date/time
- Show action buttons: Confirm, Reject, Complete

### Step 3: Handle Confirm Action
```javascript
const confirmBooking = async (bookingId, samagriType) => {
  const response = await fetch(`/api/booking-details/bookings/${bookingId}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${panditToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      samagriType: samagriType, // "standard" or "customize"
      note: "Optional note here"
    })
  });
  return await response.json();
};
```

### Step 4: Handle Complete Action
```javascript
const completeBooking = async (bookingId) => {
  const response = await fetch(`/api/booking-details/bookings/${bookingId}/complete`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${panditToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      completionNote: "Pooja successfully completed"
    })
  });
  return await response.json();
};
```

### Step 5: Handle Reject Action
```javascript
const rejectBooking = async (bookingId, reasonType, otherReason = "") => {
  const response = await fetch(`/api/booking-details/bookings/${bookingId}/reject`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${panditToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reasonType: reasonType,
      otherReason: otherReason, // only if reasonType is "other"
      note: "Optional rejection note"
    })
  });
  return await response.json();
};
```

---

## Error Responses

### Invalid Booking ID
```json
{
  "success": false,
  "message": "Invalid booking id"
}
```

### Booking Not Found
```json
{
  "success": false,
  "message": "Booking not found"
}
```

### Cannot Complete Cancelled Booking
```json
{
  "success": false,
  "message": "Cancelled booking cannot be completed"
}
```

### Already Completed
```json
{
  "success": false,
  "message": "Booking is already completed"
}
```

### Missing Required Field
```json
{
  "success": false,
  "message": "samagriType is required and must be standard or customize"
}
```

---

## Testing with curl

### Get Bookings
```bash
curl -X GET http://localhost:8000/api/booking-details/bookings \
  -H "Authorization: Bearer YOUR_PANDIT_JWT_TOKEN"
```

### Confirm Booking
```bash
curl -X PATCH http://localhost:8000/api/booking-details/bookings/BOOKING_ID/approve \
  -H "Authorization: Bearer YOUR_PANDIT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"samagriType": "standard", "note": "Will provide standard items"}'
```

### Complete Booking
```bash
curl -X PATCH http://localhost:8000/api/booking-details/bookings/BOOKING_ID/complete \
  -H "Authorization: Bearer YOUR_PANDIT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completionNote": "Completed successfully"}'
```

### Reject Booking
```bash
curl -X PATCH http://localhost:8000/api/booking-details/bookings/BOOKING_ID/reject \
  -H "Authorization: Bearer YOUR_PANDIT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reasonType": "time_slot_already_booked", "note": "Already booked"}'
```

---

## Notes
- All endpoints require valid Pandit JWT authentication token
- Token should be sent in Authorization header as `Bearer <token>`
- Pandit can only update their own assigned bookings
- Booking status cannot be reversed (e.g., cannot undo completion)
- All timestamps are stored in UTC format

