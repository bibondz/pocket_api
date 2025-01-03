# แผนการปรับปรุงระบบในอนาคต

## 1. การปรับปรุงโครงสร้าง Collections

### Collections ใหม่ที่จะเพิ่ม:

1. **tank_user_assignments**
   ```javascript
   {
       id: "ID",
       user: "relation(users)",
       tank: "relation(tanks)",
       department: "relation(departments)",
       permissions: {
           read: boolean,
           write: boolean,
           manage: boolean
       },
       created: "timestamp",
       updated: "timestamp"
   }
   ```
   - แยกการจัดการสิทธิ์การเข้าถึงถังออกมาเป็น collection แยก
   - ทำให้การจัดการสิทธิ์มีความยืดหยุ่นมากขึ้น
   - สามารถติดตามการเปลี่ยนแปลงสิทธิ์ได้ง่าย

2. **tank_access_logs**
   ```javascript
   {
       id: "ID",
       user: "relation(users)",
       tank: "relation(tanks)",
       department: "relation(departments)",
       action: "string",     // 'view', 'update', 'permission_change'
       details: "json",      // รายละเอียดการเปลี่ยนแปลง
       created: "timestamp"
   }
   ```
   - เก็บประวัติการเข้าถึงและการเปลี่ยนแปลงสิทธิ์
   - ใช้ในการตรวจสอบย้อนหลัง
   - ช่วยในการ audit และ compliance

3. **department_roles**
   ```javascript
   {
       id: "ID",
       user: "relation(users)",
       department: "relation(departments)",
       role: "string",      // 'manager', 'operator'
       created: "timestamp",
       updated: "timestamp"
   }
   ```
   - แยกการจัดการบทบาทออกมาเป็น collection แยก
   - ทำให้การจัดการบทบาทมีความยืดหยุ่นมากขึ้น
   - รองรับการเพิ่มบทบาทใหม่ในอนาคต

## 2. ขั้นตอนการปรับปรุง

1. **Phase 1: เตรียมการ**
   - สร้าง collections ใหม่
   - เตรียม migration scripts
   - ทดสอบระบบใหม่คู่ขนานกับระบบเดิม

2. **Phase 2: การย้ายข้อมูล**
   - ย้ายข้อมูลจาก department_user_access ไปยัง collections ใหม่
   - ตรวจสอบความถูกต้องของข้อมูล
   - ทดสอบการทำงานของระบบใหม่

3. **Phase 3: การปรับเปลี่ยน**
   - ค่อยๆ ย้ายการใช้งานไปยังระบบใหม่
   - ปรับปรุง API endpoints
   - ปรับปรุง frontend ให้รองรับโครงสร้างใหม่

## 3. ประโยชน์ที่จะได้รับ

1. **การจัดการสิทธิ์ที่ดีขึ้น**
   - แยกการจัดการสิทธิ์ออกจากการจัดการบทบาท
   - ติดตามการเปลี่ยนแปลงได้ง่าย
   - ยืดหยุ่นในการกำหนดสิทธิ์

2. **การตรวจสอบที่ดีขึ้น**
   - มีประวัติการเข้าถึงและการเปลี่ยนแปลง
   - สามารถตรวจสอบย้อนหลังได้
   - รองรับการทำ audit

3. **การขยายระบบในอนาคต**
   - รองรับการเพิ่มบทบาทใหม่
   - รองรับการเพิ่มประเภทสิทธิ์ใหม่
   - ปรับแต่งให้เข้ากับความต้องการได้ง่าย 

## 4. การออกแบบ API Endpoints

1. **Tank Assignment APIs**
   ```javascript
   // Assign tanks to users
   POST /api/tanks/{tankId}/assignments
   {
       user_id: string,
       permissions: {
           read: boolean,
           write: boolean,
           manage: boolean
       }
   }

   // Get user's tank assignments
   GET /api/users/{userId}/tank-assignments
   
   // Update tank permissions
   PATCH /api/tanks/{tankId}/assignments/{userId}
   ```

2. **Department Role APIs**
   ```javascript
   // Assign role in department
   POST /api/departments/{departmentId}/roles
   {
       user_id: string,
       role: string
   }

   // Get department roles
   GET /api/departments/{departmentId}/roles
   ```

3. **Access Logs APIs**
   ```javascript
   // Get tank access logs
   GET /api/tanks/{tankId}/logs
   
   // Get user activity logs
   GET /api/users/{userId}/activity
   ```

## 5. การรักษาความปลอดภัย

1. **การตรวจสอบสิทธิ์**
   - ตรวจสอบ role ระดับ department ก่อนเสมอ
   - ตรวจสอบ permissions ระดับ tank เป็นลำดับถัดไป
   - บันทึก log ทุกครั้งที่มีการเข้าถึงหรือเปลี่ยนแปลงสิทธิ์

2. **การป้องกันการเข้าถึง**
   - ป้องกันการข้าม department
   - ป้องกันการยกระดับสิทธิ์ตัวเอง
   - ตรวจสอบความถูกต้องของ input ทุกครั้ง

3. **Rate Limiting**
   - จำกัดจำนวนการเรียก API
   - แยก rate limit ตาม endpoint
   - เพิ่ม cache สำหรับข้อมูลที่เรียกบ่อย

## 6. การ Monitor และ Maintenance

1. **Performance Monitoring**
   - ติดตามเวลาตอบสนองของ API
   - ติดตามการใช้งาน resources
   - ตั้ง alert เมื่อมีปัญหา

2. **Data Maintenance**
   - ทำ data cleanup ตามระยะเวลา
   - archive logs ที่เก่าเกินไป
   - optimize database indexes

3. **Backup Strategy**
   - สำรองข้อมูลแบบ incremental
   - ทดสอบการกู้คืนข้อมูลเป็นระยะ
   - เก็บ backup ในหลายที่

## 7. แผนรองรับการขยายตัว

1. **Horizontal Scaling**
   - แยก services ตาม domain
   - ใช้ load balancer
   - เพิ่ม read replicas

2. **Caching Strategy**
   - ใช้ Redis สำหรับ frequently accessed data
   - Cache user permissions
   - Cache department structure

3. **Queue System**
   - ใช้ message queue สำหรับ background tasks
   - แยก write operations
   - รองรับ async operations 