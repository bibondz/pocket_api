## Admin Endpoints Status

### User Management
- ✅ POST /admin/users - Create new user
- ✅ GET /admin/users - List all users
- ✅ GET /admin/users/:id - Get user by ID
- ✅ PATCH /admin/users/:id - Update user
- ✅ DELETE /admin/users/:id - Delete user

### Department Management
- ✅ POST /admin/departments - Create new department
- ✅ GET /admin/departments - List all departments
- ✅ GET /admin/departments/:id - Get department by ID
- ✅ PATCH /admin/departments/:id - Update department
- ✅ DELETE /admin/departments/:id - Delete department

### Tank Management
- ✅ POST /admin/tanks - Create new tank
- ✅ GET /admin/tanks - List all tanks
- ✅ GET /admin/tanks/:id - Get tank by ID
- ✅ PATCH /admin/tanks/:id - Update tank
- ✅ DELETE /admin/tanks/:id - Delete tank

### Features
- ✅ Authentication with JWT token
- ✅ Error handling
- ✅ Pagination support
- ✅ Filtering support
- ✅ Sorting support
- ✅ Data expansion support

### Notes
- All endpoints require authentication token
- Default pagination: 50 items per page
- Query parameters supported: filter, sort, expand, page, perPage
- Department access is optional when creating users
- User verification is handled through the verified field (default: false)

## Department Endpoints Status

### Basic CRUD
- ✅ POST /departments - Create new department
- ✅ GET /departments - List all departments
- ✅ GET /departments/:id - Get department by ID
- ✅ PATCH /departments/:id - Update department
- ✅ DELETE /departments/:id - Delete department

### Member Management
- ✅ POST /departments/:id/members - Add member to department
- ✅ GET /departments/:id/members - List department members
- ✅ PATCH /departments/:deptId/members/:userId - Update member
- ✅ DELETE /departments/:deptId/members/:userId - Remove member

### Tank Management
- ✅ GET /departments/:id/tanks - List department tanks
- ✅ POST /departments/:id/tanks/:tankId - Add tank to department
- ✅ DELETE /departments/:id/tanks/:tankId - Remove tank from department

### Tank Permissions
- ✅ POST /departments/:deptId/tanks/:tankId/permissions - Grant tank access
- ✅ GET /departments/:deptId/tanks/:tankId/permissions - List tank permissions
- ✅ PATCH /departments/:deptId/tanks/:tankId/permissions/:userId - Update tank permissions
- ✅ DELETE /departments/:deptId/tanks/:tankId/permissions/:userId - Revoke tank permissions

### Utility Endpoints
- ✅ GET /departments/available-users - List available users
- ✅ GET /departments/tanks/available - List available tanks

## Tank Endpoints Status

### Basic CRUD with ID
- ✅ GET /tanks - List all tanks
- ✅ POST /tanks - Create new tank
- ✅ GET /tanks/:id - Get tank by ID
- ✅ PATCH /tanks/:id - Update tank
- ✅ DELETE /tanks/:id - Delete tank

### Tank Operations with tank_id
- ✅ GET /tanks/by-tank-id/:tankId - Get tank by tank_id
- ✅ PATCH /tanks/by-tank-id/:tankId - Update tank by tank_id
- ✅ DELETE /tanks/by-tank-id/:tankId - Delete tank by tank_id
- ✅ PATCH /tanks/by-tank-id/:tankId/progress - Update tank progress by tank_id

### Tank Status & Monitoring
- ✅ PATCH /tanks/:id/status - Update tank status
- ✅ PATCH /tanks/:id/percentage - Update tank percentage
- ✅ GET /stats/overview - Get tank statistics

### Batch Operations
- ✅ PATCH /batch/update - Update multiple tanks
- ✅ DELETE /batch/delete - Delete multiple tanks

### Tank Assignment
- ✅ GET /departments/:departmentId/operators/:operatorId/tanks - List operator's tanks
- ✅ POST /departments/:departmentId/operators/:operatorId/tanks/:tankId/assign - Assign tank to operator
- ✅ DELETE /departments/:departmentId/operators/:operatorId/tanks/:tankId - Unassign tank
- ✅ PATCH /departments/:departmentId/operators/:operatorId/tanks/:tankId/permissions - Update tank permissions

### Features
- ✅ Authentication with JWT token
- ✅ Error handling
- ✅ Pagination support
- ✅ Filtering support
- ✅ Sorting support
- ✅ Data expansion support

### Notes
- All endpoints require authentication token
- Default pagination: 50 items per page
- Query parameters supported: filter, sort, expand, page, perPage
- Tank permissions are managed at department level
- Tank status changes are logged for audit purposes 

### Tank Identification
- ✅ GET /tanks/by-tank-id/:tankId - Get tank by tank_id
- ✅ PATCH /tanks/by-tank-id/:tankId - Update tank by tank_id
- ✅ DELETE /tanks/by-tank-id/:tankId - Delete tank by tank_id 