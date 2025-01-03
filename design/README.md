# Tank Management System Design (Draft)

## โครงสร้างโปรเจค
```
/tank-api-v2
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

## API Endpoints

### Tanks
- GET    /api/tanks                    // List tanks
- POST   /api/tanks                    // Create tank
- GET    /api/tanks/:id                // Get tank by UUID
- PATCH  /api/tanks/:id                // Update tank by UUID
- GET    /api/tanks/by-tank-id/:tankId // Get tank by tank_id
- PATCH  /api/tanks/by-tank-id/:tankId // Update tank by tank_id
- POST   /api/tanks/assign             // Assign tank to department
- POST   /api/tanks/unassign           // Unassign tank from department

### Departments
- GET    /api/departments              // List departments
- POST   /api/departments              // Create department
- GET    /api/departments/:id          // Get department
- PATCH  /api/departments/:id          // Update department
- GET    /api/departments/:id/tanks    // List department tanks
- POST   /api/departments/:id/users    // Add user to department
- DELETE /api/departments/:id/users/:userId // Remove user from department

### Access Control
- GET    /api/access/check            // Check user permissions
- POST   /api/access/grant            // Grant permissions
- POST   /api/access/revoke           // Revoke permissions
- POST   /api/access/groups           // Manage tank groups

## การจัดการสิทธิ์

### 1. สิทธิ์เริ่มต้น (Default Permissions)
- ทุกผู้ใช้ในแผนกจะได้สิทธิ์เริ่มต้นตามที่กำหนดใน `tank_groups.all`
- สามารถกำหนดสิทธิ์ read/write สำหรับทุกถังในแผนก

### 2. กลุ่มถังพิเศษ (Special Groups)
- จัดกลุ่มถังที่ต้องการกำหนดสิทธิ์พิเศษ
- แต่ละกลุ่มมีรายการถังและสิทธิ์เฉพาะ
- เหมาะสำหรับจัดการถังที่เกี่ยวข้องกัน

### 3. ข้อยกเว้น (Exceptions)
- กำหนดสิทธิ์พิเศษสำหรับถังเฉพาะ
- ใช้ override สิทธิ์เริ่มต้นและสิทธิ์กลุ่ม
- เหมาะสำหรับถังที่ต้องการการควบคุมพิเศษ

## ลำดับการตรวจสอบสิทธิ์
1. ตรวจสอบข้อยกเว้น (Exceptions) ก่อน
2. ถ้าไม่มีข้อยกเว้น ตรวจสอบกลุ่มพิเศษ (Special Groups)
3. ถ้าไม่อยู่ในกลุ่มพิเศษ ใช้สิทธิ์เริ่มต้น (Default Permissions) 