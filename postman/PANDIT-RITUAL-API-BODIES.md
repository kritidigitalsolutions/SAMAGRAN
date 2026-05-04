# Pandit Ritual API Request Bodies

## 1. Add Ritual For Pandit
**Endpoint:** `POST /api/pandit/rituals`

**Description:** Add a new ritual offering for pandit (or create ritual if it doesn't exist)

**Request Body:**
```json
{
  "ritualId": "67abc123def456789ghi0123",
  "title": "Wedding Ritual",
  "description": "Traditional Hindu Marriage rituals",
  "image": "https://example.com/wedding-ritual.jpg",
  "durationHours": 2,
  "travelForSpecialPooja": true,
  "standardSamagri": true,
  "customSamagri": true,
  "customSamagriItems": [
    {
      "itemName": "Ghee",
      "quantity": 2,
      "size": "500ml"
    },
    {
      "itemName": "Flowers",
      "quantity": 5,
      "size": "Dozen"
    }
  ],
  "isSelected": true
}
```

**Field Details:**
- `ritualId` (optional): MongoDB ObjectId of existing ritual. If provided, uses that ritual. If not provided, `title` is required.
- `title` (optional if ritualId provided): Name of the ritual
- `description` (optional): Details about the ritual
- `image` (optional): URL to ritual image
- `durationHours` (optional, default: 2): Duration in hours
- `travelForSpecialPooja` (optional, default: false): Whether travel is available for special poojas
- `standardSamagri` (optional, default: false): Whether standard samagri items are provided
- `customSamagri` (optional, default: false): Whether custom samagri items are available
- `customSamagriItems` (optional, default: []): Array of custom samagri items
- `isSelected` (optional, default: true): Whether this ritual is selected for pandit's offerings

**Response:**
```json
{
  "success": true,
  "message": "Ritual added for pandit",
  "data": {
    "ritual": {
      "_id": "67abc123def456789ghi0123",
      "title": "Wedding Ritual",
      "description": "Traditional Hindu Marriage rituals",
      "image": "https://example.com/wedding-ritual.jpg",
      "durationHours": 2,
      "status": "active"
    },
    "offering": {
      "name": "Wedding Ritual",
      "isSelected": true,
      "durationHours": 2,
      "customSamagriItems": [
        {
          "_id": "67xyz789abc123def456ghi1",
          "itemName": "Ghee",
          "quantity": 2,
          "size": "500ml",
          "approvalStatus": "pending"
        }
      ]
    }
  }
}
```

---

## 2. Add Custom Samagri to Ritual
**Endpoint:** `POST /api/pandit/rituals/:ritualId/custom-samagri`

**Description:** Add a custom samagri item to a ritual offering (item will be pending admin approval)

**URL Parameters:**
- `ritualId` (required): MongoDB ObjectId of the ritual

**Request Body:**
```json
{
  "itemName": "Pure Ghee",
  "quantity": 2,
  "size": "500ml"
}
```

**Field Details:**
- `itemName` (required): Name of the samagri item
- `quantity` (optional, default: 1): Quantity required, minimum 1
- `size` (optional, default: ""): Size/unit of the item (e.g., "500ml", "1kg", "Dozen")

**Response:**
```json
{
  "success": true,
  "message": "Custom samagri added successfully",
  "data": {
    "ritualId": "67abc123def456789ghi0123",
    "ritualName": "Wedding Ritual",
    "customSamagriItems": [
      {
        "_id": "67xyz789abc123def456ghi1",
        "itemName": "Pure Ghee",
        "quantity": 2,
        "size": "500ml",
        "approvalStatus": "pending",
        "reviewedAt": null,
        "reviewedBy": ""
      }
    ]
  }
}
```

---

## Example Postman Requests

### cURL Examples

#### Add Ritual
```bash
curl -X POST http://localhost:3000/api/pandit/rituals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PANDIT_TOKEN>" \
  -d '{
    "title": "Wedding Ritual",
    "description": "Traditional Hindu Marriage rituals",
    "durationHours": 2,
    "customSamagri": true,
    "isSelected": true
  }'
```

#### Add Custom Samagri
```bash
curl -X POST http://localhost:3000/api/pandit/rituals/67abc123def456789ghi0123/custom-samagri \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PANDIT_TOKEN>" \
  -d '{
    "itemName": "Pure Ghee",
    "quantity": 2,
    "size": "500ml"
  }'
```

---

## Postman Collection Template

Create a new request in Postman:

### Request 1: Add Ritual
```
POST {{base_url}}/api/pandit/rituals
Authorization: Bearer {{pandit_token}}
Content-Type: application/json

{
  "title": "{{ritual_title}}",
  "description": "{{ritual_description}}",
  "durationHours": {{duration}},
  "customSamagri": {{custom_samagri}},
  "isSelected": true
}
```

### Request 2: Add Custom Samagri
```
POST {{base_url}}/api/pandit/rituals/{{ritual_id}}/custom-samagri
Authorization: Bearer {{pandit_token}}
Content-Type: application/json

{
  "itemName": "{{item_name}}",
  "quantity": {{quantity}},
  "size": "{{size}}"
}
```

---

## Important Notes

1. **Authentication**: Both endpoints require pandit JWT token in Authorization header
2. **Approval Workflow**: Items added via custom-samagri endpoint are automatically set to `approvalStatus: "pending"`
3. **Visibility**: Pending items are visible to admin for approval but NOT visible in public pandit profile
4. **Status Values**: 
   - `pending` - waiting for admin review
   - `approved` - admin approved, visible in public profile
   - `rejected` - admin rejected

---

## Validation Rules

### Add Ritual
- If `ritualId` provided: fetches existing ritual, ignores title/description
- If `ritualId` not provided: `title` is required
- `durationHours` must be > 0

### Add Custom Samagri
- `itemName` is required (cannot be empty)
- `quantity` must be >= 1
- `size` is optional but recommended for clarity
