# Tank API Documentation

## Endpoints

### List Tanks
```
GET /app2/tanks
```
Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `perPage` (optional): Items per page (default: 20)
- `status` (optional): Filter by status ('active', 'inactive', 'maintenance')
- `department` (optional): Filter by department ID
- `search` (optional): Search by name or tank_id
- `cursor` (optional): Cursor for pagination

### Get Tank by ID
```
GET /app2/tanks/:id
```
Path Parameters:
- `id`: Tank UUID

### Get Tank by Tank ID
```
GET /app2/tanks/by-tank-id/:tankId
```
Path Parameters:
- `tankId`: Custom tank identifier

### Create Tank
```
POST /app2/tanks
```
Required Fields:
- `name`: Tank name (string, 1-100 characters)
- `tank_id`: Custom tank identifier (string, 3-50 characters, must be unique)

Optional Fields:
- `description`: Tank description (string, max 500 characters)
- `capacity`: Tank capacity (number, default: 0)
- `percentage`: Tank fill percentage (number, 0-100, default: 0)
- `status`: Tank status (string: 'active', 'inactive', 'maintenance', default: 'active')

### Update Tank
```
PATCH /app2/tanks/:id
```
Path Parameters:
- `id`: Tank UUID

Optional Fields (same validation as create):
- `name`: Tank name
- `description`: Tank description
- `capacity`: Tank capacity
- `percentage`: Tank fill percentage
- `status`: Tank status

### Update Tank by Tank ID
```
PATCH /app2/tanks/by-tank-id/:tankId
```
Path Parameters:
- `tankId`: Custom tank identifier

Optional Fields (same validation as create):
- `name`: Tank name
- `description`: Tank description
- `capacity`: Tank capacity
- `percentage`: Tank fill percentage
- `status`: Tank status

### Update Tank Status
```
PATCH /app2/tanks/by-tank-id/:tankId/status
```
Path Parameters:
- `tankId`: Custom tank identifier

Required Fields:
- `status`: Tank status (string: 'active', 'inactive', 'maintenance')

### Update Tank Progress
```
PATCH /app2/tanks/by-tank-id/:tankId/progress
```
Path Parameters:
- `tankId`: Custom tank identifier

Required Fields:
- `percentage`: Tank fill percentage (number, 0-100)

### Delete Tank
```
DELETE /app2/tanks/:id
```
Path Parameters:
- `id`: Tank UUID

### Delete Tank by Tank ID
```
DELETE /app2/tanks/by-tank-id/:tankId
```
Path Parameters:
- `tankId`: Custom tank identifier

## Data Schema

### Tank Object
```json
{
  "id": "string (UUID)",
  "name": "string (1-100 chars)",
  "tank_id": "string (3-50 chars, unique)",
  "description": "string (max 500 chars)",
  "capacity": "number",
  "percentage": "number (0-100)",
  "status": "string (active|inactive|maintenance)",
  "device_key": "string (32 chars)",
  "department": "string (UUID, optional)",
  "created": "string (ISO date)",
  "updated": "string (ISO date)",
  "last_signal_time": "string (ISO date, optional)"
}
```

## Validation Rules

1. Tank Name:
   - Required
   - Length: 1-100 characters
   - Can contain letters, numbers, spaces, and basic punctuation

2. Tank ID:
   - Required
   - Length: 3-50 characters
   - Must be unique
   - Can contain letters, numbers, hyphens, and underscores
   - Case sensitive

3. Description:
   - Optional
   - Maximum length: 500 characters

4. Capacity:
   - Optional
   - Must be a non-negative number
   - Default: 0

5. Percentage:
   - Optional
   - Must be between 0 and 100
   - Default: 0

6. Status:
   - Optional
   - Must be one of: 'active', 'inactive'
   - Default: 'active'

7. Device Key:
   - Generated automatically when creating a new tank
   - Length: 32 characters (16 bytes in hex format)
   - Used for device authentication when updating tank data
   - Cannot be changed after creation
   - Required for device-to-API communication

## Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "data": {}
}
```

Common Error Codes:
- 400: Bad Request (validation error)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (duplicate tank_id)
- 500: Internal Server Error 