# ระบบแจ้งเตือน (Alert System)

## โครงสร้างข้อมูล

### Collection: tank_alerts
```javascript
{
    tank: string,              // รหัสแท้งค์
    alert_type: string,        // ประเภทการแจ้งเตือน
    priority: string,          // ระดับความสำคัญ (low, medium, high, critical)
    status: string,           // สถานะ (active, acknowledged, in_progress, resolved)
    notes: string,            // บันทึกเพิ่มเติม
    created_at: date,         // เวลาที่สร้าง
    response_deadline: date,   // กำหนดเวลาที่ต้องตอบสนอง
    estimated_completion: date, // เวลาที่คาดว่าจะแก้ไขเสร็จ
    
    // การแจ้งเตือนอัตโนมัติ
    reminder_settings: {
        interval: number,      // ช่วงเวลาแจ้งเตือนซ้ำ (นาที)
        last_reminder: date    // เวลาที่แจ้งเต���อนครั้งล่าสุด
    },
    next_reminder: date,       // กำหนดเวลาแจ้งเตือนครั้งถัดไป
    reminder_history: [        // ประวัติการแจ้งเตือน
        {
            sent_at: date,     // เวลาที่ส่งแจ้งเตือน
            alert_status: string // สถานะขณะแจ้งเตือน
        }
    ],
    
    // การยกระดับอัตโนมัติ
    auto_escalation: {
        enabled: boolean,      // เปิดใช้งานการยกระดับอัตโนมัติ
        escalated: boolean,    // ถูกยกระดับแล้วหรือไม่
        escalated_at: date     // เวลาที่ถูกยกระดับ
    },
    
    // ประวัติการเปลี่ยนแปลง
    status_history: [
        {
            from_status: string,  // สถานะเดิม
            to_status: string,    // สถานะใหม่
            changed_by: string,   // ผู้เปลี่ยนแปลง
            changed_at: date,     // เวลาที่เปลี่ยนแปลง
            notes: string         // บันทึกเพิ่ม���ติม
        }
    ]
}
```

## ฟังก์ชันหลัก

### 1. การสร้างและจัดการแจ้งเตือน

```python
# สร้างการแจ้งเตือนใหม่
create_alert(
    tank_id: str,                    # รหัสแท้งค์
    alert_type: str,                 # ประเภทการแจ้งเตือน
    priority: str,                   # ระดับความสำคัญ
    notes: Optional[str] = None,     # บันทึกเพิ่มเติม
    response_time: Optional[int] = None,     # เวลาที่ต้องตอบสนอง (นาที)
    reminder_interval: Optional[int] = None  # ช่วงเวลาแจ้งเตือนซ้ำ (นาที)
)

# รับทราบการแจ้งเตือน
acknowledge_alert(
    alert_id: str,                   # รหัสการแจ้งเตือน
    user_id: str,                    # รหัสผู้ใช้
    notes: Optional[str] = None,     # บันทึกเพิ่มเติม
    assigned_to: Optional[str] = None # มอบหมายให้
)

# เริ่มดำเนินการแก้ไข
start_progress(
    alert_id: str,                   # รหัสการแจ้งเตือน
    user_id: str,                    # รหัสผู้ใช้
    notes: Optional[str] = None      # บันทึกเพิ่มเติม
)

# อัพเดทเวลาคาดว่าจะเสร็จ
update_eta(
    alert_id: str,                   # รหัสการแจ้งเตือน
    user_id: str,                    # รหัสผู้ใช้
    estimated_completion: datetime,   # เวลาที่คาดว่าจะเสร็จ
    notes: Optional[str] = None      # บันทึกเพิ่มเติม
)
```

### 2. ระบบอัตโนมัติ

```python
# ตรวจสอบการแจ้งเตือนที่ต้องดำเนินการ
check_alerts()

# ส่งการแจ้งเตือนซ้ำ
send_reminder(alert: Record)

# ยกระดับความสำคัญอัตโนมัติ
auto_escalate(alert: Record)
```

## ค่าคงที่ระบบ

### ระดับความสำคัญ
```python
priority_levels = ["low", "medium", "high", "critical"]
```

### สถานะการแจ้งเตือน
```python
status = ["active", "acknowledged", "in_progress", "resolved"]
```

## การท���งานของระบบ

1. **การสร้างการแจ้งเตือน**
   - สร้างการแจ้งเตือนใหม่ด้วยสถานะ "active"
   - ถ้ากำหนด response_time จะคำนวณ response_deadline
   - ถ้ากำหนด reminder_interval จะตั้งค่าการแจ้งเตือนซ้ำ

2. **การตรวจสอบอัตโนมัติ**
   - ระบบจะเรียก check_alerts() เป็นระยะ
   - ตรวจสอบการแจ้งเตือนที่ถึงเวลา reminder
   - ตรวจสอบการแจ้งเตือนที่เกิน response_deadline

3. **การยกระดับอัตโนมัติ**
   - เมื่อเกิน response_deadline ระบบจะยกระดับความสำคัญขึ้น 1 ระดับ
   - บันทึกประวัติการยกระดับไว้ใน status_history

4. **การแจ้งเตือนซ้ำ**
   - ส่งการแจ้งเตือนตาม reminder_interval ที่กำหนด
   - บันทึกประวัติการแจ้งเตือนไว้ใน reminder_history
   - ��ำนวณเวลาแจ้งเตือนครั้งถัดไป

## การใช้งาน

```python
# ตัวอย่างการสร้างการแจ้งเตือน
alert = await alert_service.create_alert(
    tank_id="tank123",
    alert_type="low_level",
    priority="medium",
    notes="ระดับน้ำต่ำกว่าเกณฑ์",
    response_time=30,  # ต้องตอบสนองภายใน 30 นาที
    reminder_interval=5  # แจ้งเตือนซ้ำทุก 5 นาที
)

# ตัวอย่างการรับทราบการแจ้งเตือน
await alert_service.acknowledge_alert(
    alert_id=alert.id,
    user_id="user123",
    notes="กำลังตรวจสอบ",
    assigned_to="engineer456"
)

# ตัวอย่างการเริ่มดำเนินการ
await alert_service.start_progress(
    alert_id=alert.id,
    user_id="user123",
    notes="เริ่มแก้ไขปัญหา"
)

# ตัวอย่างการอัพเดท ETA
await alert_service.update_eta(
    alert_id=alert.id,
    user_id="user123",
    estimated_completion=datetime.now() + timedelta(hours=2),
    notes="คาดว่าจะแก้ไขเส��็จภายใน 2 ชั่วโมง"
)
``` 