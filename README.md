# Tank Management System Structure

## Collections Schema

### 1. Users Collection (built-in)
```javascript
{
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin|manager|operator",
    "status": "active|inactive",
    "created": "timestamp",
    "updated": "timestamp"
}
```

### 2. Departments Collection
```javascript
{
    "id": "dept_id",
    "name": "BIO Depart",      // unique
    "description": "string",
    "status": "active|inactive",
    "created": "timestamp",
    "updated": "timestamp"
}
```

### 3. Tanks Collection
```javascript
{
    "id": "tank_id",
    "name": "Tank Name",
    "tank_id": "TANK-BIO-001", // unique
    "department": "dept_id",    // reference
    "capacity": number,
    "percentage": number,
    "status": "active|inactive|maintenance",
    "description": "string",
    "device_key": "string",
    "created": "timestamp",
    "updated": "timestamp"
}
```

### 4. Tank Access Control Collection
```javascript
{
    "id": "access_id",
    "user": "user_id",         // reference
    "department": "dept_id",    // reference
    "role": "manager|operator",
    "tank_groups": {
        "all": {
            "read": boolean,
            "write": boolean
        },
        "special": {
            "GROUP-1": {
                "read": boolean,
                "write": boolean,
                "tanks": ["tank_id1", "tank_id2"]
            }
        },
        "exceptions": {
            "tank_id": {
                "read": boolean,
                "write": boolean
            }
        }
    },
    "created": "timestamp",
    "updated": "timestamp"
}
```

## Project Structure
```
/tank-api
├── src/
│   ├── services/
│   │   ├── base.service.js           # Base service with common functionality
│   │   ├── tank.service.js           # Tank management
│   │   ├── department.service.js     # Department management
│   │   ├── user.service.js           # User management
│   │   └── access.service.js         # Access control
│   │
│   ├── routes/
│   │   ├── tank.routes.js           # Tank endpoints
│   │   ├── department.routes.js     # Department endpoints
│   │   └── user.routes.js          # User endpoints
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js       # Authentication
│   │   └── permission.middleware.js # Permission checking
│   │
│   ├── utils/
│   │   ├── cache.js                # Redis cache helper
│   │   └── validation.js           # Input validation
│   │
│   └── app.js                      # Main application file
│
├── config/
│   └── default.js                  # Configuration
│
└── tests/
    ├── integration/               # Integration tests
    └── unit/                     # Unit tests
```

## API Endpoints

### Tanks
- GET    /app2/tanks                    // List tanks
- POST   /app2/tanks                    // Create tank
- GET    /app2/tanks/:id                // Get tank by UUID
- PATCH  /app2/tanks/:id                // Update tank by UUID
- GET    /app2/tanks/by-tank-id/:tankId // Get tank by tank_id
- PATCH  /app2/tanks/by-tank-id/:tankId // Update tank by tank_id
- POST   /app2/tanks/assign             // Assign tank to department
- POST   /app2/tanks/unassign           // Unassign tank from department

### Departments
- GET    /app2/departments              // List departments
- POST   /app2/departments              // Create department
- GET    /app2/departments/:id          // Get department
- PATCH  /app2/departments/:id          // Update department
- GET    /app2/departments/:id/tanks    // List department tanks
- POST   /app2/departments/:id/users    // Add user to department
- DELETE /app2/departments/:id/users/:userId // Remove user from department

### Access Control
- GET    /app2/access/check            // Check user permissions
- POST   /app2/access/grant            // Grant permissions
- POST   /app2/access/revoke           // Revoke permissions
- POST   /app2/access/groups           // Manage tank groups 