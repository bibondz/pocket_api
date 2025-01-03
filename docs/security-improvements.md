# Security Improvements Plan

## Current State
ปัจจุบัน frontend เข้าถึง PocketBase โดยตรง เนื่องจากข้อจำกัดในการพัฒนา แต่มีแผนที่จะปรับปรุงในอนาคต

## Current Redis Implementation
ระบบปัจจุบันสามารถใช้ Redis เพื่อเพิ่มประสิทธิภาพและความปลอดภัย:

### 1. Rate Limiting
```javascript
class RateLimiter {
    constructor(redis) {
        this.redis = redis;
    }

    async checkLimit(key, limit, window) {
        const current = await this.redis.incr(key);
        if (current === 1) {
            await this.redis.expire(key, window);
        }
        return current <= limit;
    }
}

// ตัวอย่างการใช้งาน
const rateLimiter = new RateLimiter(redis);
const canAccess = await rateLimiter.checkLimit(
    `api_key:${keyId}:requests`, 
    1000,  // จำกัด 1000 requests
    3600   // ต่อ 1 ชั่วโมง
);
```

### 2. API Key Caching
```javascript
class ApiKeyCache {
    constructor(redis) {
        this.redis = redis;
    }

    async getPermissions(key) {
        const cached = await this.redis.get(`permissions:${key}`);
        if (cached) return JSON.parse(cached);
        
        // ถ้าไม่มีใน cache ให้ดึงจาก PocketBase
        const permissions = await fetchFromPocketBase(key);
        await this.redis.setex(
            `permissions:${key}`, 
            300,  // cache 5 นาที
            JSON.stringify(permissions)
        );
        return permissions;
    }

    async invalidateKey(key) {
        await this.redis.del(`permissions:${key}`);
    }
}
```

### 3. Temporary Block List
```javascript
class BlockList {
    constructor(redis) {
        this.redis = redis;
    }

    async blockKey(key, reason, duration = 3600) {
        await this.redis.setex(
            `blocked:${key}`,
            duration,
            reason
        );
    }

    async isBlocked(key) {
        return await this.redis.exists(`blocked:${key}`);
    }
}
```

### 4. Usage Statistics
```javascript
class UsageStats {
    constructor(redis) {
        this.redis = redis;
    }

    async trackRequest(keyId, tankId, action) {
        const now = Date.now();
        await this.redis.zadd(
            `usage:${keyId}:${tankId}:${action}`,
            now,
            now
        );
        // เก็บข้อมูล 24 ชั่วโมง
        await this.redis.zremrangebyscore(
            `usage:${keyId}:${tankId}:${action}`,
            0,
            now - 86400000
        );
    }

    async getStats(keyId, tankId, action) {
        const now = Date.now();
        return await this.redis.zcount(
            `usage:${keyId}:${tankId}:${action}`,
            now - 3600000,  // 1 ชั่วโมงที่ผ่านมา
            now
        );
    }
}
```

### 5. Department Access Cache
```javascript
class DepartmentAccessCache {
    constructor(redis) {
        this.redis = redis;
    }

    async getUserAccess(userId, departmentId) {
        const key = `access:${userId}:${departmentId}`;
        const cached = await this.redis.get(key);
        if (cached) return JSON.parse(cached);

        const access = await fetchFromPocketBase(userId, departmentId);
        await this.redis.setex(key, 300, JSON.stringify(access));
        return access;
    }

    async invalidateAccess(userId, departmentId) {
        await this.redis.del(`access:${userId}:${departmentId}`);
    }
}
```

### การนำไปใช้งาน
1. **Rate Limiting**: ป้องกันการใช้งาน API มากเกินไป
2. **Caching**: ลดการเรียก PocketBase และเพิ่มความเร็ว
3. **Block List**: ระงับ API key ที่มีพฤติกรรมน่าสงสัย
4. **Usage Monitoring**: ติดตามการใช้งานแบบ real-time
5. **Access Control**: cache ข้อมูลสิทธิ์เพื่อลดการ query

## Known Security Concerns
1. การเข้าถึง PocketBase Admin UI และ API โดยตรง
2. การ bypass ระบบ permissions ที่ออกแบบไว้
3. ความเสี่ยงในการจัดการ API Keys ผ่าน PocketBase โดยตรง

## Future Improvements Plan

### 1. User Management Service
ต้องพัฒนา service layer สำหรับจัดการผู้ใช้ทั้งหมด:
- Login/Register
- Password management
- Role และ Permission management
- Session management
- Audit logging

```javascript
class UserManagementService {
    async login(email, password) {
        // Custom authentication flow
    }

    async register(userData) {
        // Custom registration with proper validation
    }

    async changePassword(userId, oldPassword, newPassword) {
        // Secure password change
    }

    async assignRole(userId, role, departmentId) {
        // Role management with proper checks
    }
}
```

### 2. Security Layers
เพิ่มระบบรักษาความปลอดภัย:
- Custom JWT implementation
- Rate limiting
- IP filtering
- Device fingerprinting
- Audit logging สำหรับการเปลี่ยนแปลงสำคัญ

### 3. API Access Control
ปรับ API rules ใน PocketBase ให้เข้มงวดขึ้น:
```javascript
// Example: users collection
{
    "create": false,
    "read": "@request.auth.id != ''",
    "update": false,
    "delete": false,
    "listRule": "@request.auth.role = 'admin'",
    "viewRule": "@request.auth.id = id"
}
```

### 4. Middleware Layer
เพิ่ม middleware สำหรับตรวจสอบการเข้าถึง:
```javascript
const authMiddleware = async (req, res, next) => {
    // Token validation
    // Permission checking
    // Request logging
};
```

### 5. Service-Only Access
- ทุกการเข้าถึงข้อมูลต้องผ่าน service layer
- ป้องกันการเข้าถึง PocketBase โดยตรง
- ควบคุมการ query และ mutation ผ่าน service methods

### 6. Audit System
```javascript
class AuditService {
    async logAction(userId, action, details) {
        // Log all important actions
        // Track changes
        // Monitor suspicious activities
    }
}
```

## Implementation Priority
1. User Management Service
2. Security Middleware
3. Audit System
4. API Access Control
5. Custom Authentication

## Notes
- ต้องวางแผนการ migrate จากระบบปัจจุบัน
- ต้องทำ documentation ให้ชัดเจน
- ต้องมีการทดสอบความปลอดภัยอย่างครอบคลุม
- Frontend จะต้องปรับการเรียกใช้งานให้ผ่าน service layer ทั้งหมด

## Current Workarounds
ในระหว่างที่ยังไม่ได้ implement ระบบใหม่:
1. ใช้ API Rules ใน PocketBase เพื่อจำกัดการเข้าถึง
2. ตรวจสอบ permissions ผ่าน services ที่มีอยู่ (เช่น ApiKeyService)
3. Monitor การใช้งานอย่างใกล้ชิด
4. จำกัดการเข้าถึง Admin UI เฉพาะผู้ดูแลระบบ 