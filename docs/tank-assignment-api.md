# Tank Assignment API Documentation

## Overview

The Tank Assignment API provides endpoints for managing tank assignments and permissions for operators within departments. This API allows department managers to assign tanks to operators and manage their access permissions.

## Authentication

All endpoints require authentication using a valid JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### List Operator Tanks

Lists all tanks assigned to a specific operator in a department with their permissions.

```
GET /tank-assignments/ex/departments/{departmentId}/operators/{operatorId}/tanks
```

#### Parameters

- `departmentId` (path) - ID of the department
- `operatorId` (path) - ID of the operator

#### Response

```json
{
  "tanks": [
    {
      "id": "PKS-P1",
      "name": "Process Tank 1",
      "permissions": {
        "read": true,
        "write": true,
        "manage": false,
        "create_token": false
      }
    }
  ]
}
```

### Assign Tank to Operator

Assigns a tank to an operator with specified permissions. Only department managers can assign tanks.

```
POST /tank-assignments/ex/departments/{departmentId}/operators/{operatorId}/tanks
```

#### Parameters

- `departmentId` (path) - ID of the department
- `operatorId` (path) - ID of the operator
- `tankId` (path) - ID of the tank to assign

#### Request Body

```json
{
  "permissions": {
    "read": true,
    "write": true,
    "manage": false,
    "create_token": false
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Tank assigned successfully"
}
```

### Update Tank Permissions

Updates permissions for an operator's assigned tank. Only department managers can modify permissions.

```
PATCH /tank-assignments/ex/departments/{departmentId}/operators/{operatorId}/tanks/{tankId}
```

#### Parameters

- `departmentId` (path) - ID of the department
- `operatorId` (path) - ID of the operator
- `tankId` (path) - ID of the tank

#### Request Body

```json
{
  "permissions": {
    "read": true,
    "write": true,
    "manage": true,
    "create_token": false
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Permissions updated successfully"
}
```

## Error Responses

The API uses standard HTTP status codes and returns error messages in a consistent format:

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions to perform this action"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters"
} 