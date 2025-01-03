# Tank API Schemas

## Tank Schema

```json
{
  "id": "string",
  "name": "string",
  "tank_id": "string",
  "description": "string",
  "type": "string",  // storage, process, etc.
  "capacity": "number",
  "unit": "string",  // liters, gallons, etc.
  "location": {
    "building": "string",
    "floor": "string",
    "zone": "string",
    "coordinates": {
      "lat": "number",
      "lng": "number"
    }
  },
  "specifications": {
    "material": "string",
    "diameter": "number",
    "height": "number",
    "maxPressure": "number",
    "temperature": {
      "min": "number",
      "max": "number"
    }
  },
  "status": {
    "current": "string",  // active, inactive, maintenance
    "percentage": "number",  // 0-100
    "lastUpdated": "string"  // ISO date
  },
  "maintenance": {
    "lastCheck": "string",  // ISO date
    "nextCheck": "string",  // ISO date
    "frequency": "string"   // daily, weekly, monthly, quarterly
  },
  "sensors": {
    "level": "boolean",
    "temperature": "boolean",
    "pressure": "boolean"
  },
  "settings": {
    "alertThreshold": "number",  // percentage
    "criticalThreshold": "number",  // percentage
    "autoRefill": "boolean"
  },
  "metadata": {
    "manufacturer": "string",
    "installDate": "string",  // ISO date
    "warrantyExpiry": "string",  // ISO date
    "notes": "string"
  },
  "created": "string",  // ISO date
  "updated": "string"   // ISO date
}
```

## Tank Status Update Schema
```json
{
  "status": "string"  // active, inactive, maintenance
}
```

## Tank Percentage Update Schema
```json
{
  "percentage": "number"  // 0-100
}
```

## Tank Statistics Schema
```json
{
  "total": "number",
  "active": "number",
  "inactive": "number",
  "maintenance": "number",
  "averageCapacity": "number",
  "totalCapacity": "number",
  "alerts": {
    "critical": "number",
    "warning": "number"
  }
}
```

## Tank Assignment Schema
```json
{
  "tankId": "string",
  "operatorId": "string",
  "departmentId": "string",
  "permissions": {
    "read": "boolean",
    "write": "boolean",
    "manage": "boolean"
  }
}
``` 