# Progress Report

## API Keys
- ✅ GET /app2/api-keys - แสดงรายการ API keys ทั้งหมด พร้อม pagination, sorting และ filtering
  - Query parameters: page, perPage, sort, search, status, department
- ✅ POST /app2/api-keys - สร้าง API key ใหม่
- ✅ GET /app2/api-keys/me - ดู API keys ของตัวเอง
- ✅ PATCH /app2/api-keys/:id/revoke - เพิกถอน API key
- ✅ GET /app2/api-keys/:id - ดูรายละเอียด API key ตาม ID
- ✅ PATCH /app2/api-keys/:id - อัพเดท API key

## Tank Endpoints
- ✅ GET /app2/tanks - แสดงรายการถัง
- ✅ POST /app2/tanks - สร้างถังใหม่
- ✅ GET /app2/tanks/:id - ดูรายละเอียดถัง
- ✅ GET /app2/tanks/by-tank-id/
- ✅ PATCH /app2/tanks/:id - อัพเดทข้อมูลถัง
- ✅ DELETE /app2/tanks/:id - ลบถัง
- ✅ PATCH /app2/tanks/:id/status - อัพเดทสถานะถัง
- ✅ PATCH /app2/tanks/:id/percentage - อัพเดทระดับน้ำในถัง
- ✅ PATCH /batch/update - อัพเดทถังแบบกลุ่ม
- ✅ DELETE /batch/delete - ลบถังแบบกลุ่ม
- ✅ GET /stats/overview - ดูสถิติภาพรวมของถัง

## Department Endpoints
- ✅ GET /app2/departments - แสดงรายการแผนก พร้อม pagination, sorting และ filtering
  - สามารถกรองด้วย name, location
  - สามารถเรียงลำดับตาม created
  - Query Parameters:
    - page: number (default: 1)
    - perPage: number (default: 50) 
    - filter: string (e.g. `name~'Test'`, `location~'Test'`)
    - sort: string (default: "-created", prefix - for desc)

- ✅ POST /app2/departments - สร้างแผนกใหม่
  - Request: `{"name":"string", "description":"string", "location":"string"}`
  - Response: `{"success":true, "data":{...}}`

- ✅ GET /app2/departments/:id - ดูรายละเอียดแผนก
  - แสดงข้อมูลแผนกครบถ้วน
  - Response: `{"success":true, "data":{...}}`

- ✅ PATCH /app2/departments/:id - อัพเดทข้อมูลแผนก
  - อัพเดทข้อมูลพื้นฐานได้
  - มีการอัพเดท timestamp
  - Request: `{"name?":"string", "description?":"string", "location?":"string"}`
  - Response: `{"success":true, "data":{...}}`

- ✅ DELETE /app2/departments/:id - ลบแผนก
  - ลบแผนกได้สำเร็จ
  - Response: `{"success":true, "message":"Department deleted successfully"}`

## Member Management
- POST /app2/departments/:id/members - เพิ่มสมาชิกในแผนก
  - Request: `{"userId":"string", "role":"string"}`
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/departments/:id/members/:userId - ลบสมาชิกออกจากแผนก
  - Response: `{"success":true, "message":"Member removed successfully"}`

- GET /app2/departments/:id/members - ดูรายชื่อสมาชิกในแผนก
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/departments/:id/members/:userId/tank-permissions - อัพเดทสิทธิ์การเข้าถึงถัง
  - Request: `{"permissions":["read","write","manage"]}`
  - Response: `{"success":true, "data":{...}}`

## Tank Management
- GET /app2/departments/:id/tanks - ดูรายการถังในแผนก
  - Response: `{"success":true, "data":{...}}`

- POST /app2/departments/:id/tanks/:tankId - เพิ่มถังให้แผนก
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/departments/:id/tanks/:tankId - ลบถังออกจากแผนก
  - Response: `{"success":true, "message":"Tank removed successfully"}`

- GET /app2/departments/tanks/available - ดูรายการถังที่ยังไม่ได้อยู่ในแผนกใด
  - Response: `{"success":true, "data":{...}}`

- GET /app2/departments/available-users - ดูรายชื่อผู้ใช้ที่ยังไม่ได้อยู่ในแผนกใด
  - Response: `{"success":true, "data":{...}}`

## User Endpoints
- ✅ GET /app2/users/:userId/departments - ดูแผนกของผู้ใช้
  - แสดงข้อมูลแผนกที่ผู้ใช้มีสิทธิ์เข้าถึง
  - แสดง id, name, role, location ของแผนก

- ✅ GET /app2/users/:userId/tanks - ดูถังที่ได้รับมอบหมาย
  - แสดงข้อมูลถังพร้อมสิทธิ์การเข้าถึง (read, write, manage)
  - เรียงตาม created date

- ❌ GET /app2/users/:userId/activities - ดูประวัติกิจกรรม
  - ยังไม่สามารถใช้งานได้ (ต้องสร้าง activities collection)

# API Documentation

## Authentication
- POST /app2/auth/login - เข้าสู่ระบบ
  - Request: `{"email":"string", "password":"string"}`
  - Response: `{"success":true, "data":{"token":"string", "user":{...}}}`

## Departments
- GET /app2/departments - แสดงรายการแผนก
  - Query Parameters:
    - page: number (default: 1)
    - perPage: number (default: 50) 
    - filter: string (e.g. `name~'Test'`, `location~'Test'`)
    - sort: string (default: "-created", prefix - for desc)
  - Response: `{"success":true, "data":{...}}`

- POST /app2/departments - สร้างแผนกใหม่
  - Request: `{"name":"string", "description":"string", "location":"string"}`
  - Response: `{"success":true, "data":{...}}`

- GET /app2/departments/:id - ดูรายละเอียดแผนก
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/departments/:id - อัพเดทข้อมูลแผนก
  - Request: `{"name?":"string", "description?":"string", "location?":"string"}`
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/departments/:id - ลบแผนก
  - Response: `{"success":true, "message":"Department deleted successfully"}`

## Department Member Management
- POST /app2/departments/:id/members - เพิ่มสมาชิกในแผนก
  - Request: `{"userId":"string", "role":"string"}`
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/departments/:id/members/:userId - ลบสมาชิกออกจากแผนก
  - Response: `{"success":true, "message":"Member removed successfully"}`

- GET /app2/departments/:id/members - ดูรายชื่อสมาชิกในแผนก
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/departments/:id/members/:userId/tank-permissions - อัพเดทสิทธิ์การเข้าถึงถัง
  - Request: `{"permissions":["read","write","manage"]}`
  - Response: `{"success":true, "data":{...}}`

## Department Tank Management
- GET /app2/departments/:id/tanks - ดูรายการถังในแผนก
  - Response: `{"success":true, "data":{...}}`

- POST /app2/departments/:id/tanks/:tankId - เพิ่มถังให้แผนก
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/departments/:id/tanks/:tankId - ลบถังออกจากแผนก
  - Response: `{"success":true, "message":"Tank removed successfully"}`

- GET /app2/departments/tanks/available - ดูรายการถังที่ยังไม่ได้อยู่ในแผนกใด
  - Response: `{"success":true, "data":{...}}`

- GET /app2/departments/available-users - ดูรายชื่อผู้ใช้ที่ยังไม่ได้อยู่ในแผนกใด
  - Response: `{"success":true, "data":{...}}`

## Tanks
- GET /app2/tanks - แสดงรายการถัง
  - Query Parameters:
    - page: number (default: 1)
    - perPage: number (default: 50)
    - filter: string (e.g. `name~'Test'`, `tank_id~'TANK'`, `department='id'`)
    - sort: string (default: "-created")
  - Response: `{"success":true, "data":{...}}`

- POST /app2/tanks - สร้างถังใหม่
  - Request: `{"name":"string", "tank_id":"string", "department":"string", "description?":"string"}`
  - Response: `{"success":true, "data":{...}}`

- GET /app2/tanks/:id - ดูรายละเอียดถัง
  - Response: `{"success":true, "data":{...}}`

- GET /app2/tanks/by-tank-id/:tank_id - ดูรายละเอียดถังด้วย tank_id
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/tanks/:id - อัพเดทข้อมูลถัง
  - Request: `{"name?":"string", "description?":"string", "department?":"string"}`
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/tanks/:id - ลบถัง
  - Response: `{"success":true, "message":"Tank deleted successfully"}`

- PATCH /app2/tanks/:id/status - อัพเดทสถานะถัง
  - Request: `{"status":"active"|"inactive"|"maintenance"}`
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/tanks/:id/progress - อัพเดทความคืบหน้าของถัง
  - Request: `{"percentage":number}`
  - Response: `{"success":true, "data":{...}}`

## Tank Batch Operations
- PATCH /app2/tanks/batch/update - อัพเดทถังแบบกลุ่ม
  - Request: `{"ids":["string"], "data":{"status?":"string", "department?":"string"}}`
  - Response: `{"success":true, "data":{...}}`

- DELETE /app2/tanks/batch/delete - ลบถังแบบกลุ่ม
  - Request: `{"ids":["string"]}`
  - Response: `{"success":true, "message":"Tanks deleted successfully"}`

## Tank Statistics
- GET /app2/tanks/stats/overview - ดูสถิติภาพรวมของถัง
  - Response: `{"success":true, "data":{"total":number, "active":number, "inactive":number, "maintenance":number}}`

## Users
- GET /app2/users/:userId/departments - ดูแผนกของผู้ใช้
  - Response: `{"success":true, "data":{...}}`

- GET /app2/users/:userId/tanks - ดูถังที่ได้รับมอบหมาย
  - Response: `{"success":true, "data":{...}}`

## API Keys
- GET /app2/api-keys - แสดงรายการ API keys
  - Query Parameters:
    - page: number (default: 1)
    - perPage: number (default: 50)
    - sort: string (default: "-created")
    - search: string
    - status: string
    - department: string
  - Response: `{"success":true, "data":{...}}`

- POST /app2/api-keys - สร้าง API key ใหม่
  - Request: `{"name":"string", "department?":"string", "expires?":"string"}`
  - Response: `{"success":true, "data":{...}}`

- GET /app2/api-keys/me - ดู API keys ของตัวเอง
  - Response: `{"success":true, "data":{...}}`

- GET /app2/api-keys/:id - ดูรายละเอียด API key
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/api-keys/:id - อัพเดท API key
  - Request: `{"name?":"string", "department?":"string", "expires?":"string"}`
  - Response: `{"success":true, "data":{...}}`

- PATCH /app2/api-keys/:id/revoke - เพิกถอน API key
  - Response: `{"success":true, "message":"API key revoked successfully"}`

## Tank Import/Export
- POST /app2/tanks/import - นำเข้าถังจากข้อมูล JSON
  - Request: `{"tanks":[{"name":"string","tank_id":"string","description?":"string","capacity?":number,"percentage?":number,"status?":"string"}]}`
  - Response: `{"success":true,"data":{"import_id":"string","results":[...]}}`

- POST /app2/tanks/import/csv - นำเข้าถังจากไฟล์ CSV
  - Request: FormData with file field
  - Response: `{"success":true,"data":{"import_id":"string","results":[...]}}`

- GET /app2/tanks/import/history - ดูประวัติการนำเข้า
  - Query Parameters:
    - page: number (default: 1)
    - perPage: number (default: 50)
    - sort: string (default: "-created")
  - Response: `{"success":true,"data":{"items":[...],"page":number,"perPage":number,"totalItems":number,"totalPages":number}}`

## Tank Management
- POST /app2/tanks/assign - กำหนดถังให้แผนก
  - Request: `{"tankId":"string","departmentId":"string"}`
  - Response: `{"success":true,"data":{...}}`

- POST /app2/tanks/transfer - ย้ายถังระหว่างแผนก
  - Request: `{"tankId":"string","fromDepartmentId":"string","toDepartmentId":"string"}`
  - Response: `{"success":true,"data":{...}}`

### Tank Transfer
- ✅ POST /tanks/transfer - โอนย้ายถังระหว่างแผนก
  - Request: `{"tankId":"string", "fromDepartmentId":"string", "toDepartmentId":"string"}`
  - Response: `{"success":true, "data":{...}}`
  - Permissions:
    - Admin สามารถโอนย้ายถังได้โดยไม่มีข้อจำกัด
    - Manager ต้องเป็น manager ของทั้งแผนกต้นทางและปลายทาง
  - Validation:
    - ตรวจสอบว่าถังอยู่ในแผนกต้นทางจริง
    - ตรวจสอบสิทธิ์ของผู้ใช้งาน
    - บันทึกประวัติการโอนย้าย

### Tank Import
- ❌ POST /tanks/import - นำเข้าข้อมูลถังจากไฟล์
  - Request: Array of tank objects
  - Response: `{"success":true, "data":{...}}`
  - Status: ยังไม่สามารถใช้งานได้ (404 Not Found)

- ❌ GET /tanks/import/history - ดูประวัติการนำเข้าข้อมูล
  - Response: `{"success":true, "data":{...}}`
  - Status: ยังไม่สามารถใช้งานได้ (404 Not Found)

  get token to use services curl -X POST "https://api.irissar.com/api/collections/users/auth-with-password" -H "Content-Type: application/json" -d '{"identity": "admin@tank-api.test", "password": "AdminTest@2024"}'

  ห้ามแก้ auth.middleware.js หรือจะทำให้ระบบทำงานไม่ได้

## Latest Test Results (2024-12-31)
### Tank Endpoints Testing
- ✅ GET /app2/tanks - Successfully retrieved list of tanks with search functionality
- ✅ POST /app2/tanks - Successfully created new tank with proper validation
  - Validated device_key length requirement (32 characters)
  - Validated required fields (name, tank_id, department)
- ✅ GET /app2/tanks/:id - Successfully retrieved specific tank details
- ✅ PATCH /app2/tanks/:id - Successfully updated tank information
  - Updated description and capacity
  - Maintained proper validation

### Tank Management Features
- ✅ Tank Search - Successfully implemented search by name/description
- ✅ Tank Creation - Successfully implemented with proper field validation
- ✅ Tank Updates - Successfully implemented with field validation
- ✅ Tank Retrieval - Successfully implemented with proper error handling

### Department Management Features (2024-12-31)
- ✅ Department Listing - Successfully retrieved list of departments
  - Pagination working correctly
  - Proper response format with all department details
- ✅ Department Creation - Successfully created new department
  - All required fields validated
  - Proper response with department details
- ✅ Department Details - Successfully retrieved specific department
  - Complete department information returned
  - Proper error handling for invalid IDs
- ✅ Department Updates - Successfully updated department information
  - Partial updates supported
  - Timestamp updated correctly
- ✅ Department Deletion - Successfully deleted department
  - Clean removal of department
  - Proper validation of department existence
- ✅ Department Tanks - Successfully retrieved tanks in department
  - Proper filtering by department ID
  - Empty array returned when no tanks assigned

### Operator Management Features (2024-12-31)
- ✅ List Operator Tanks - Successfully retrieved list of tanks assigned to operator
  - Proper filtering by user ID
  - Shows tank permissions (read, write, manage)
  - Shows department association
- ✅ Assign Tank to Operator - Successfully assigned tank with permissions
  - Proper permission structure (read, write, manage)
  - Updates existing permissions correctly
- ✅ Update Tank Permissions - Successfully updated operator's tank permissions
  - Maintains existing permissions for other tanks
  - Validates permission structure
  - Updates timestamp correctly

### Permission Management Features (2024-12-31)
- ✅ Grant Operator Permissions - Successfully granted full permissions to operator
  - Can grant read, write, and manage permissions
  - Updates permissions immediately
  - Maintains proper permission structure
- ✅ Revoke Operator Permissions - Successfully revoked permissions from operator
  - Can revoke specific permissions (read, write, manage)
  - Updates take effect immediately
  - Proper validation of permission changes
- ✅ Remove Tank Permissions - Successfully removed all tank permissions
  - Complete removal of tank access
  - Clean permission structure after removal
  - Proper timestamp updates

### Department Member Search Features (2024-12-31)
- ✅ List Department Members - Successfully retrieved list of members in department
  - Shows member details (name, role, email)
  - Shows member's tank permissions
  - Shows member's department role
- ✅ Filter Members by Role - Successfully filtered members by role
  - Can filter operators/managers separately
  - Shows filtered members with full details
  - Maintains proper data structure
- ✅ Member Details Display - Successfully shows detailed member information
  - Complete user profile information
  - Current tank permissions
  - Department role and access level

### Department Tank Inventory Features (2024-12-31)
- ✅ Department Tank List - Successfully retrieved list of tanks in department
  - Shows all tanks assigned to department
  - Shows tank details (name, status, capacity)
  - Shows current tank levels and status
- ✅ Department Tank Count - Successfully retrieved tank count per department
  - Shows total number of tanks
  - Shows active vs inactive tanks
  - Shows tanks under maintenance
- ✅ Department Tank Overview - Successfully shows department tank information
  - Department details with tank count
  - Tank assignment history
  - Tank status distribution

### Simple Search Features (2024-12-31)
- ✅ Simple Tank Search - ค้นหาถังแบบง่าย
  - ค้นหาด้วยชื่อ: `/app2/tanks/search?name=Tank1`
  - ค้นหาด้วยรหัส: `/app2/tanks/search?id=TANK001`
  - ค้นหาตามแผนก: `/app2/tanks/search?department=Production`
  - ค้นหาตามสถานะ: `/app2/tanks/search?status=active`
  - รองรับ pagination: `page`, `perPage`
  - รองรับการเรียงลำดับ: `sort=-created`, `sort=name`

- ✅ Simple Department Search - ค้นหาแผนกแบบง่าย
  - ค้นหาด้วยชื่อ: `/app2/departments/search?name=Production`
  - ค้นหาตามสถานที่: `/app2/departments/search?location=Building`
  - รองรับ pagination และ sorting เช่นเดียวกับถัง

- ✅ Simple User Search - ค้นหาผู้ใช้แบบง่าย
  - ค้นหาด้วยชื่อ: `/app2/users/search?name=John`
  - ค้นหาตามบทบาท: `/app2/users/search?role=operator`
  - ค้นหาตามแผนก: `/app2/users/search?department=Production`
  - รองรับ pagination และ sorting เช่นเดียวกับถัง

### Search Features Improvements
- ✅ ลดความซับซ้อนของ query parameters
- ✅ ไม่แสดง UUID ที่ไม่จำเป็น
- ✅ รองรับการค้นหาแบบ partial match
- ✅ ยังคงความสามารถของ pagination และ sorting
- ✅ แสดงผลลัพธ์ในรูปแบบที่อ่านง่าย

## User Profile Features (2024-12-31)
- ✅ GET /app2/users/me - ดูข้อมูลผู้ใช้ปัจจุบัน
  - แสดงข้อมูลส่วนตัว (id, name, email, role)
  - แสดงแผนกที่สังกัดอยู่
  - แสดงถังที่ได้รับมอบหมายพร้อมสิทธิ์การเข้าถึง
  - Response Format:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "string",
          "name": "string",
          "email": "string",
          "role": "string",
          "created": "string",
          "updated": "string"
        },
        "departments": [...],
        "tanks": [...]
      }
    }
    ```

## Collection Form Fields (2024-12-31)

### Tank Collection
- Required Fields (ข้อมูลที่จำเป็นต้องกรอก):
  - `name`: string - ชื่อถัง
  - `tank_id`: string - รหัสถังเฉพาะ (unique)
  - `device_key`: string - รหัสอุปกรณ์ (32 ตัวอักษร)
  - `department`: string - ID แผนกที่ถังสังกัด
  
- Optional Fields (ข้อมูลเพิ่มเติม):
  - `description`: string - รายละเอียดถัง
  - `capacity`: number - ความจุถัง (ลิตร)
  - `percentage`: number - ระดับน้ำปัจจุบัน (0-100)
  - `status`: string - สถานะถัง (active/inactive/maintenance)
  - `location`: string - ตำแหน่งที่ตั้ง
  - `notes`: string - บันทึกเพิ่มเติม

### Department Collection
- Required Fields:
  - `name`: string - ชื่อแผนก
  - `location`: string - สถานที่ตั้ง
  
- Optional Fields:
  - `description`: string - รายละเอียดแผนก
  - `manager_id`: string - ID ผู้จัดการแผนก
  - `contact_info`: string - ข้อมูลติดต่อ
  - `notes`: string - บันทึกเพิ่มเติม

### User Collection
- Required Fields:
  - `email`: string - อีเมล (unique)
  - `name`: string - ชื่อผู้ใช้
  - `password`: string - รหัสผ่าน
  - `role`: string - บทบาท (admin/manager/operator)
  
- Optional Fields:
  - `department`: string - ID แผนกที่สังกัด
  - `phone`: string - เบอร์โทรศัพท์
  - `position`: string - ตำแหน่งงาน
  - `notes`: string - บันทึกเพิ่มเติม

### Department User Access Collection
- Required Fields:
  - `user`: string - ID ผู้ใช้
  - `department`: string - ID แผนก
  - `role`: string - บทบาทในแผนก (manager/operator)
  
- Optional Fields:
  - `tank_permissions`: object - สิทธิ์การเข้าถึงถัง
    ```json
    {
      "tank_id": {
        "read": boolean,
        "write": boolean,
        "manage": boolean
      }
    }
    ```
  - `notes`: string - บันทึกเพิ่มเติม

### API Key Collection
- Required Fields:
  - `name`: string - ชื่อ API key
  - `key`: string - รหัส API (auto-generated)
  
- Optional Fields:
  - `department`: string - ID แผนกที่เชื่อมโยง
  - `expires`: string - วันหมดอายุ (ISO 8601)
  - `permissions`: array - สิทธิ์การเข้าถึง
  - `notes`: string - บันทึกเพิ่มเติม

## API Keys Management System (2024-12-31)

### API Key Endpoints
- ✅ GET /app2/api-keys - ดูรายการ API Keys ทั้งหมด
  - Query Parameters:
    - `page`: number - หน้าที่ต้องการ (default: 1)
    - `perPage`: number - จำนวนรายการต่อหน้า (default: 50)
    - `sort`: string - การเรียงลำดับ (default: "-created")
    - `filter`: string - กรองข้อมูล (เช่น name, department)
  - Response Format:
    ```json
    {
      "success": true,
      "data": {
        "items": [{
          "id": "string",
          "name": "string",
          "key": "string",
          "department": "string",
          "expires": "string",
          "created": "string",
          "updated": "string"
        }],
        "page": number,
        "perPage": number,
        "totalItems": number,
        "totalPages": number
      }
    }
    ```

- ✅ POST /app2/api-keys - สร้าง API Key ใหม่
  - Request Body:
    ```json
    {
      "name": "string (required)",
      "department": "string (optional)",
      "expires": "string (optional, ISO 8601)",
      "permissions": ["read", "write"] (optional)
    }
    ```
  - Response: `{"success":true, "data":{...}}`
  - หมายเหตุ: 
    - `key` จะถูกสร้างอัตโนมัติ
    - ถ้าไม่ระบุ `expires` จะไม่มีวันหมดอายุ
    - ถ้าไม่ระบุ `permissions` จะได้สิทธิ์ read อย่างเดียว

- ✅ GET /app2/api-keys/:id - ดูรายละเอียด API Key
  - Response: `{"success":true, "data":{...}}`
  - แสดงข้อมูลเต็มรวมถึงประวัติการใช้งาน

- ✅ PATCH /app2/api-keys/:id - อัพเดทข้อมูล API Key
  - Request Body:
    ```json
    {
      "name": "string (optional)",
      "department": "string (optional)",
      "expires": "string (optional)",
      "permissions": ["read", "write"] (optional)
    }
    ```
  - Response: `{"success":true, "data":{...}}`
  - หมายเหตุ: ไม่สามารถแก้ไข `key` ได้

- ✅ DELETE /app2/api-keys/:id - ลบ API Key
  - Response: `{"success":true}`
  - หมายเหตุ: จะลบถาวรไม่สามารถกู้คืนได้

- ✅ PATCH /app2/api-keys/:id/revoke - เพิกถอน API Key
  - Response: `{"success":true}`
  - หมายเหตุ: Key จะถูกปิดการใช้งานแต่ยังคงอยู่ในระบบ

### API Key Usage
1. การสร้าง API Key:
   ```bash
   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
   -d '{"name":"Test API Key","department":"dept_id","expires":"2024-12-31T23:59:59Z"}' \
   "https://api.irissar.com/app2/api-keys"
   ```

2. การใช้ API Key:
   ```bash
   curl -H "X-API-Key: YOUR_API_KEY" "https://api.irissar.com/app2/tanks"
   ```

### API Key Permissions
- `read`: อ่านข้อมูลได้อย่างเดียว
- `write`: อ่านและเขียนข้อมูลได้
- `manage`: จัดการข้อมูลได้ทั้งหมด (รวมถึงลบ)

### API Key Security
- API Key จะถูกเข้ารหัสก่อนเก็บในฐานข้อมูล
- สามารถกำหนดวันหมดอายุได้
- สามารถเพิกถอนได้ทันทีถ้าพบการใช้งานที่ผิดปกติ
- จำกัดการเรียกใช้งานต่อวินาที (Rate Limiting)
- บันทึกประวัติการใช้งานทั้งหมด

## Permission Checking System (2024-12-31)

### ระดับการตรวจสอบสิทธิ์
1. Authentication Check (ตรวจสอบการยืนยันตัวตน):
   - ตรวจสอบ token ทุกครั้งที่เรียก API
   - ตรวจสอบว่า token ยังไม่หมดอายุ
   - ตรวจสอบว่า token ถูกเพิกถอนหรือไม่
   - ถ้าใช้ API Key ต้องตรวจสอบความถูกต้องและการหมดอายุ

2. Role-Based Access Control (RBAC):
   - Admin: เข้าถึงได้ทุกส่วน ไม่มีข้อจำกัด
   - Manager: 
     - จัดการได้เฉพาะในแผนกของตัวเอง
     - ไม่สามารถลบหรือแก้ไขข้อมูลของแผนกอื่น
     - สามารถดูข้อมูลพื้นฐานของแผนกอื่นได้
   - Operator:
     - เข้าถึงได้เฉพาะถังที่ได้รับมอบหมาย
     - มีสิทธิ์ตามที่ถูกกำหนด (read/write/manage)
     - ไม่สามารถแก้ไขสิทธิ์ของตัวเองหรือผู้อื่น

3. Department-Level Permissions:
   - ตรวจสอบว่าผู้ใช้อยู่ในแผนกที่ถูกต้อง
   - Manager สามารถ:
     - เพิ่ม/ลบ/แก้ไขถังในแผนก
     - จัดการสิทธิ์ operator ในแผนก
     - ดูรายงานและสถิติของแผนก
   - Operator สามารถ:
     - ดูข้อมูลถังที่ได้รับมอบหมาย
     - อัพเดทสถานะถังตามสิทธิ์ที่ได้รับ
     - ดูรายงานเฉพาะถังที่รับผิดชอบ

4. Tank-Level Permissions:
   - read:
     - ดูข้อมูลพื้นฐานของถัง
     - ดูสถานะและระดับน้ำ
     - ดูประวัติการใช้งาน
   - write:
     - อัพเดทข้อมูลถัง
     - เปลี่ยนสถานะถัง
     - บันทึกการบำรุงรักษา
   - manage:
     - เพิ่ม/ลบถัง
     - กำหนดสิทธิ์การเข้าถึง
     - ย้ายถังระหว่างแผนก

### การตรวจสอบแบบเข้มงวด
1. API Request Validation:
   ```javascript
   // ตรวจสอบ token
   if (!isValidToken(token)) {
     throw new Error('Invalid or expired token');
   }

   // ตรวจสอบบทบาท
   if (!hasRequiredRole(user, requiredRole)) {
     throw new Error('Insufficient permissions');
   }

   // ตรวจสอบแผนก
   if (!isInDepartment(user, departmentId)) {
     throw new Error('Access denied: Not in department');
   }

   // ตรวจสอบสิทธิ์ถัง
   if (!hasTankPermission(user, tankId, requiredPermission)) {
     throw new Error('Access denied: Insufficient tank permissions');
   }
   ```

2. Data Access Filtering:
   ```javascript
   // กรองข้อมูลตามสิทธิ์
   const tanks = await getTanks({
     departmentId: user.department,
     permissions: user.permissions,
     role: user.role
   });

   // ตรวจสอบความเป็นเจ้าของ
   if (tank.department !== user.department && user.role !== 'admin') {
     throw new Error('Access denied: Tank belongs to different department');
   }
   ```

3. Action Logging:
   ```javascript
   // บันทึกการกระทำทุกอย่าง
   await logAction({
     userId: user.id,
     action: 'UPDATE_TANK',
     targetId: tankId,
     details: changes,
     timestamp: new Date()
   });
   ```

### ตัวอย่างการใช้งาน
1. Manager จัดการถังในแผนก:
   ```bash
   # ต้องมี token ที่ถูกต้อง และเป็น manager ของแผนกนั้น
   curl -X PATCH \
   -H "Authorization: Bearer YOUR_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{"status":"maintenance"}' \
   "https://api.irissar.com/app2/tanks/TANK-001/status"
   ```

2. Operator อัพเดทสถานะถัง:
   ```bash
   # ต้องมีสิทธิ์ write สำหรับถังนี้
   curl -X PATCH \
   -H "Authorization: Bearer YOUR_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{"percentage":75}' \
   "https://api.irissar.com/app2/tanks/TANK-001"
   ```

### การป้องกันการโจมตี
1. Rate Limiting:
   - จำกัด request ต่อ IP
   - จำกัด request ต่อ token/API key
   - เพิ่ม delay เมื่อ request มากเกินไป

2. Input Validation:
   - ตรวจสอบ input ทุกตัวก่อนประมวลผล
   - ป้องกัน SQL Injection
   - ป้องกัน XSS Attack

3. Error Handling:
   - ไม่เปิดเผยข้อมูลภายในระบบ
   - แสดง error message ที่เหมาะสม
   - บันทึก error ทั้งหมดเพื่อตรวจสอบ

## Tank ID System (2024-12-31)

### ระบบรหัสถัง
1. รูปแบบรหัสถัง:
   ```
   [PREFIX]-[DEPARTMENT]-[NUMBER]
   เช่น: TANK-PROD-001, TANK-LAB-042
   ```
   - PREFIX: TANK (คงที่)
   - DEPARTMENT: รหัสย่อแผนก (2-4 ตัวอักษร)
   - NUMBER: เลขลำดับ (3 หลัก)

2. การเชื่อมโยงกับ UUID:
   - ภายนอก: ใช้รหัสถังที่อ่านง่าย (TANK-PROD-001)
   - ภายใน: เก็บเป็น UUID เพื่อความปลอดภัย
   - มีตาราง mapping ระหว่างรหัสถังและ UUID

3. ข้อดีของระบบ:
   - ผู้ใช้งานจดจำและอ้างอิงง่าย
   - รู้ว่าถังอยู่แผนกไหนจากรหัส
   - ยากต่อการเดารหัสถังของแผนกอื่น
   - ยังคงความปลอดภัยด้วย UUID ภายใน

### ตัวอย่างการใช้งาน
1. การสร้างถังใหม่:
   ```bash
   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{
     "name": "Production Tank 1",
     "tank_id": "TANK-PROD-001",
     "department": "PROD",
     "capacity": 1000
   }' "https://api.irissar.com/app2/tanks"
   ```

2. การค้นหาถัง:
   ```bash
   # ค้นหาด้วยรหัสถังที่อ่านง่าย
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/tanks/search?id=TANK-PROD-001"

   # ค้นหาถังในแผนก
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/tanks/search?department=PROD"
   ```

### การรักษาความปลอดภัย
1. การป้องกันการเดารหัส:
   - รหัสถังต้องผ่านการตรวจสอบรูปแบบ
   - ต้องมีสิทธิ์ในแผนกนั้นๆ
   - บันทึกการพยายามเข้าถึงที่ไม่ได้รับอนุญาต

2. การตรวจสอบสิทธิ์:
   ```javascript
   // ตรวจสอบรูปแบบรหัสถัง
   if (!isValidTankFormat(tankId)) {
     throw new Error('Invalid tank ID format');
   }

   // ตรวจสอบว่าผู้ใช้อยู่ในแผนกที่ถูกต้อง
   const deptCode = getTankDepartment(tankId);
   if (!userHasAccessToDepartment(user, deptCode)) {
     throw new Error('Access denied: Invalid department');
   }
   ```

3. การแสดงข้อมูล:
   - แสดงรหัสถังที่อ่านง่ายในส่วนติดต่อผู้ใช้
   - เก็บ UUID ไว้ในระบบฐานข้อมูล
   - mapping table มีการเข้ารหัสและจำกัดการเข้าถึง

### ข้อควรระวัง
1. ห้ามใช้รหัสถังที่คาดเดาง่ายเกินไป
2. ห้ามใช้ข้อมูลที่ละเอียดอ่อนในรหัสถัง
3. ควรมีระบบ audit log ที่บันทึกการเข้าถึงทั้งหมด
4. ควรมีระบบแจ้งเตือนเมื่อมีการพยายามเข้าถึงที่ผิดปกติ

## Tank Display System (2024-12-31)

### การแสดงผลข้อมูลถังแบบเป็นมิตร
1. หน้าแสดงรายการถัง:
   ```json
   {
     "tanks": [{
       "display_name": "ถังผลิตภัณฑ์ 1",
       "tank_code": "PROD-001",
       "department": "ฝ่ายผลิต",
       "location": "อาคาร A ชั้น 2",
       "status": "กำลังใช้งาน",
       "capacity": "1,000 ลิตร",
       "current_level": "75%",
       "last_updated": "2 นาทีที่แล้ว"
     }]
   }
   ```

2. การแสดงสถานะถัง:
   - `active` → "กำลังใช้งาน"
   - `inactive` → "ไม่ได้ใช้งาน"
   - `maintenance` → "กำลังซ่อมบำรุง"
   - `error` → "มีปัญหา"

3. การแสดงระดับ:
   - แสดงเป็นเปอร์เซ็นต์: "75%"
   - แสดงปริมาตร: "750/1,000 ลิตร"
   - สีแสดงสถานะ:
     - เขียว: ระดับปกติ (20-80%)
     - เหลือง: ต่ำ/สูง (10-20% หรือ 80-90%)
     - แดง: วิกฤต (<10% หรือ >90%)

4. การแสดงเวลา:
   - เมื่อกี้นี้ (< 1 นาที)
   - x นาทีที่แล้ว
   - x ชั่วโมงที่แล้ว
   - วันที่ เวลา (> 24 ชั่วโมง)

### ตัวอย่างการใช้งาน
1. ดูรายการถังในแผนก:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/tanks?department=PROD&language=th"
   ```
   Response:
   ```json
   {
     "tanks": [
       {
         "display_name": "ถังผลิตภัณฑ์ 1",
         "status": "กำลังใช้งาน",
         "level": {
           "percent": "75%",
           "volume": "750/1,000 ลิตร",
           "status": "normal"
         },
         "location": "อาคาร A ชั้น 2",
         "last_update": "2 นาทีที่แล้ว"
       }
     ]
   }
   ```

2. ดูรายละเอียดถัง:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/tanks/PROD-001?language=th"
   ```
   Response:
   ```json
   {
     "tank": {
       "display_name": "ถังผลิตภัณฑ์ 1",
       "department": "ฝ่ายผลิต",
       "status": {
         "current": "กำลังใช้งาน",
         "since": "3 วันที่แล้ว"
       },
       "level": {
         "current": "75%",
         "volume": "750 ลิตร",
         "capacity": "1,000 ลิตร",
         "status": "normal",
         "trend": "คงที่"
       },
       "location": {
         "building": "อาคาร A",
         "floor": "ชั้น 2",
         "zone": "โซนผลิต"
       },
       "maintenance": {
         "last": "15 วันที่แล้ว",
         "next": "อีก 15 วัน"
       }
     }
   }
   ```

### ฟีเจอร์เพิ่มเติม
1. การแสดงผลภาษาไทย/อังกฤษ
2. การแสดงแนวโน้มระดับน้ำ (เพิ่มขึ้น/ลดลง/คงที่)
3. การแสดงประวัติการบำรุงรักษา
4. การแจ้งเตือนเมื่อถึงกำหนดบำรุงรักษา

### API Key Display Format
1. สำหรับ Admin:
   ```json
   {
     "api_keys": [{
       "name": "Production Tank Monitor",
       "key": "pk_live_xxxxx",  // แสดง 5 ตัวท้าย
       "department": "ฝ่ายผลิต",
       "tanks": ["TANK-PROD-001", "TANK-PROD-002"],  // รหัสถังที่เข้าถึงได้
       "permissions": ["read", "write"],
       "created_by": "John (Admin)",
       "expires": "อีก 30 วัน",
       "last_used": "2 นาทีที่แล้ว",
       "status": "กำลังใช้งาน"
     }]
   }
   ```

2. สำหรับ Manager:
   ```json
   {
     "api_keys": [{
       "name": "Production Tank Monitor",
       "key": "pk_live_xxxxx",  // แสดงเฉพาะ key ที่ตัวเองสร้าง
       "department": "ฝ่ายผลิต",
       "tanks": ["TANK-PROD-001", "TANK-PROD-002"],  // แสดงเฉพาะถังในแผนก
       "permissions": ["read", "write"],
       "expires": "อีก 30 วัน",
       "status": "กำลังใช้งาน"
     }]
   }
   ```

### การแสดงผลแบบเป็นมิตร
1. แสดงรหัสถังที่เข้าใจง่าย:
   - แทนที่จะแสดง UUID ของถัง
   - แสดงเป็นรหัสถังที่อ่านง่าย เช่น "TANK-PROD-001"
   - แสดงชื่อถังในวงเล็บ เช่น "TANK-PROD-001 (ถังผลิตภัณฑ์ 1)"

2. แสดงสถานะที่ชัดเจน:
   - "กำลังใช้งาน" (active)
   - "หมดอายุ" (expired)
   - "ถูกเพิกถอน" (revoked)
   - "ใกล้หมดอายุ - เหลือ X วัน" (expiring soon)

3. แสดงการใช้งานล่าสุด:
   - "เมื่อกี้นี้" (< 1 นาที)
   - "X นาทีที่แล้ว"
   - "X ชั่วโมงที่แล้ว"
   - "ไม่เคยใช้งาน"

4. แสดงสิทธิ์แบบเข้าใจง่าย:
   - "อ่านอย่างเดียว" (read)
   - "อ่านและเขียน" (read, write)
   - "จัดการทั้งหมด" (manage)

### ตัวอย่างการใช้งาน
1. ดู API Keys ทั้งหมด (สำหรับ Admin):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys?language=th"
   ```

2. ดู API Keys ในแผนก (สำหรับ Manager):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys?department=PROD&language=th"
   ```

### ความปลอดภัย
1. การแสดง API Key:
   - Admin: เห็น key เต็มของทุก key
   - Manager: เห็น key เต็มเฉพาะที่ตัวเองสร้าง
   - แสดงเป็นรหัสที่อ่านง่าย ไม่ใช่ UUID

### API Key Viewing Endpoints
1. GET /app2/api-keys/me - ดู API Keys ของตัวเอง
   ```bash
   # Basic Usage
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me"

   # แสดง UUID ด้วย
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?show_uuid=true"
   ```
   Response:
   ```json
   {
     "api_keys": [{
       "name": "Production Monitor",
       "tanks": [
         {
           "tank_id": "TANK-PROD-001",
           "name": "ถังผลิตภัณฑ์ 1",
           "uuid": "550e8400-e29b-41d4-a716-446655440000" // แสดงเมื่อใช้ show_uuid=true
         }
       ],
       "permissions": {
         "TANK-PROD-001": ["read", "write"]
       },
       "status": "active",
       "expires_in": "30 days"
     }]
   }
   ```

2. GET /app2/api-keys/:id/tanks - ดูถังที่ API Key เข้าถึงได้
   ```bash
   # Basic Usage
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/key123/tanks"

   # แสดงแบบละเอียด
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/key123/tanks?detail=true"
   ```
   Response:
   ```json
   {
     "tanks": [
       {
         "tank_id": "TANK-PROD-001",
         "name": "ถังผลิตภัณฑ์ 1",
         "department": "ฝ่ายผลิต",
         "permissions": ["read", "write"],
         "status": "active",
         "last_access": "2 นาทีที่แล้ว"
       }
     ]
   }
   ```

### Query Parameters
1. `show_uuid` (boolean):
   - `true`: แสดง UUID ข้วย
   - `false`: ไม่แสดง UUID (default)

2. `detail` (boolean):
   - `true`: แสดงข้อมูลแบบละเอียด
   - `false`: แสดงแค่ข้อมูลพื้นฐาน (default)

3. `format` (string):
   - `friendly`: แสดงชื่อถังเป็นภาษามนุษย์ (default)
   - `technical`: แสดงรหัสถังแบบเทคนิค

### ตัวอย่างการใช้งานเพิ่มเติม
1. ดูถังทั้งหมดที่เข้าถึงได้:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?detail=true"
   ```

2. ดูถังเฉพาะแผนก:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?department=PROD"
   ```

3. ค้นหาถังตามชื่อ:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?search=ผลิตภัณฑ์"
   ```

## Friendly ID Lookup Endpoints (2024-12-31)

### Tank Lookup
1. GET /app2/tank-by-id/:tank_id - ค้นหาถังด้วยรหัสที่อ่านง่าย
   ```bash
   # ค้นหาด้วยรหัสถัง
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/tank-by-id/TANK-PROD-001"

   # แสดง UUID ด้วย
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/tank-by-id/TANK-PROD-001?show_uuid=true"
   ```
   Response:
   ```json
   {
     "tank": {
       "tank_id": "TANK-PROD-001",
       "name": "ถังผลิตภัณฑ์ 1",
       "department": "ฝ่ายผลิต",
       "uuid": "550e8400-e29b-41d4-a716-446655440000",  // แสดงเมื่อใช้ show_uuid=true
       "status": "active",
       "capacity": "1,000 ลิตร",
       "current_level": "75%"
     }
   }
   ```

### Department Lookup
2. GET /app2/department-by-code/:dept_code - ค้นหาแผนกด้วยรหัสย่อ
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/department-by-code/PROD"
   ```
   Response:
   ```json
   {
     "department": {
       "code": "PROD",
       "name": "ฝ่ายผลิต",
       "uuid": "qrsjjclmm1me89d",  // แสดงเมื่อใช้ show_uuid=true
       "location": "อาคาร A",
       "total_tanks": 6
     }
   }
   ```

### User Lookup
3. GET /app2/user-by-name/:username - ค้นหาผู้ใช้ด้วยชื่อ
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/user-by-name/john.doe"
   ```
   Response:
   ```json
   {
     "user": {
       "username": "john.doe",
       "name": "John Doe",
       "uuid": "itk6rrqpwh7sd0y",  // แสดงเมื่อใช้ show_uuid=true
       "role": "operator",
       "department": "ฝ่ายผลิต"
     }
   }
   ```

### Query Parameters (ใช้ได้กับทุก endpoint)
1. `show_uuid` (boolean):
   - `true`: แสดง UUID ด้วย
   - `false`: ไม่แสดง UUID (default)

2. `detail` (boolean):
   - `true`: แสดงข้อมูลแบบละเอียด
   - `false`: แสดงแค่ข้อมูลพื้นฐาน (default)

3. `format` (string):
   - `friendly`: แสดงชื่อถังเป็นภาษามนุษย์ (default)
   - `technical`: แสดงรหัสถังแบบเทคนิค

### ตัวอย่างการใช้งานเพิ่มเติม
1. ดูถังทั้งหมดที่เข้าถึงได้:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?detail=true"
   ```

2. ดูถังเฉพาะแผนก:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?department=PROD"
   ```

3. ค้นหาถังตามชื่อ:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.irissar.com/app2/api-keys/me?search=ผลิตภัณฑ์"
   ```