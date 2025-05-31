# 📊 Database Structure Documentation

## Tổng quan

Hệ thống sử dụng **MySQL** làm cơ sở dữ liệu chính với **Prisma ORM** để quản lý schema và migration. Database được thiết kế để hỗ trợ một ứng dụng chuyển đổi file với các tính năng xác thực, phân quyền, và theo dõi hoạt động.

## Sơ đồ quan hệ

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │ 1───N │   Account   │       │   Session   │
│             │       │             │       │             │
│ - id        │       │ - id        │       │ - id        │
│ - email     │       │ - userId    │       │ - userId    │
│ - password  │       │ - provider  │       │ - token     │
│ - role      │       │ - type      │       │ - expires   │
└─────────────┘       └─────────────┘       └─────────────┘
       │ 1                                          │ 1
       │                                            │
       │ N                                          │ N
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ Conversion  │       │  RateLimit  │       │ SystemLog   │
│             │       │             │       │             │
│ - id        │       │ - id        │       │ - id        │
│ - userId    │       │ - identifier│       │ - userId    │
│ - status    │       │ - type      │       │ - level     │
│ - fromFormat│       │ - count     │       │ - message   │
└─────────────┘       └─────────────┘       └─────────────┘

           ┌─────────────┐
           │   Setting   │
           │             │
           │ - key       │
           │ - value     │
           │ - category  │
           └─────────────┘
```

## Chi tiết các bảng

### 1. 👤 Bảng `users`

**Mục đích**: Lưu trữ thông tin người dùng và quản lý tài khoản

```prisma
model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String?   // Nullable for OAuth users
  name        String?
  image       String?
  role        Role      @default(USER)
  dailyLimit  Int       @default(10)
  usedToday   Int       @default(0)
  resetDate   DateTime  @default(now())
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Chức năng**:

- **Xác thực**: Email và password cho đăng nhập truyền thống
- **Phân quyền**: Role-based access control (USER, PREMIUM, ADMIN)
- **Giới hạn sử dụng**: Theo dõi số lần chuyển đổi hàng ngày
- **Quản lý trạng thái**: Active/Inactive status

**Quan hệ**:

- `1:N` với `conversions` - Một user có nhiều conversion
- `1:N` với `accounts` - Một user có nhiều OAuth account
- `1:N` với `sessions` - Một user có nhiều session

### 2. 🔑 Bảng `accounts`

**Mục đích**: Lưu trữ thông tin xác thực OAuth từ các nhà cung cấp bên thứ ba

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            Int
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
}
```

**Chức năng**:

- **OAuth Integration**: Hỗ trợ đăng nhập qua Google, Facebook, GitHub
- **Token Management**: Lưu trữ access/refresh tokens
- **Multi-Provider**: Một user có thể liên kết nhiều OAuth provider

**Quan hệ**:

- `N:1` với `users` - Nhiều account thuộc về một user

### 3. 🎫 Bảng `sessions`

**Mục đích**: Quản lý phiên đăng nhập và JWT tokens

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       Int
  expires      DateTime
}
```

**Chức năng**:

- **Session Management**: Theo dõi phiên đăng nhập
- **Security**: Kiểm soát thời gian hết hạn
- **Multi-Device**: Hỗ trợ đăng nhập từ nhiều thiết bị

### 4. 🔄 Bảng `conversions`

**Mục đích**: Theo dõi tất cả các hoạt động chuyển đổi file

```prisma
model Conversion {
  id                Int              @id @default(autoincrement())
  userId            Int?
  jobId             String?          @unique
  fromFormat        String
  toFormat          String
  originalFilename  String?
  convertedFilename String?
  fileSize          Int?
  outputFileSize    Int?
  ipAddress         String?
  userAgent         String?
  status            ConversionStatus @default(PENDING)
  progress          Int              @default(0)
  errorMessage      String?
  processingTime    Int?
  downloadUrl       String?
  downloadCount     Int              @default(0)
  expiresAt         DateTime?
  startedAt         DateTime?
  completedAt       DateTime?
  createdAt         DateTime         @default(now())
}
```

**Chức năng**:

- **File Tracking**: Theo dõi quá trình chuyển đổi file
- **Queue Management**: Tích hợp với BullMQ qua jobId
- **Analytics**: Thu thập metrics về performance
- **Guest Support**: Hỗ trợ user ẩn danh (userId nullable)

**Status enum**:

- `PENDING`: Đang chờ xử lý
- `PROCESSING`: Đang chuyển đổi
- `COMPLETED`: Hoàn thành
- `FAILED`: Thất bại
- `EXPIRED`: Hết hạn
- `CANCELLED`: Đã hủy

### 5. ⚙️ Bảng `settings`

**Mục đích**: Cấu hình hệ thống và tham số ứng dụng

```prisma
model Setting {
  key         String   @id
  value       String   @db.Text
  description String?  @db.Text
  category    String   @default("general")
  isPublic    Boolean  @default(false)
  updatedAt   DateTime @updatedAt
  updatedBy   Int?
}
```

**Chức năng**:

- **System Config**: Cấu hình toàn hệ thống
- **Feature Flags**: Bật/tắt tính năng
- **Public/Private**: Phân quyền truy cập setting

### 6. 🚦 Bảng `rate_limits`

**Mục đích**: Kiểm soát tần suất sử dụng API

```prisma
model RateLimit {
  id            Int      @id @default(autoincrement())
  identifier    String   // IP address or user ID
  type          String   // 'ip' or 'user'
  requestsCount Int      @default(0)
  windowStart   DateTime
  windowEnd     DateTime
  isBlocked     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Chức năng**:

- **DDoS Protection**: Chống tấn công từ chối dịch vụ
- **Fair Usage**: Đảm bảo sử dụng công bằng
- **Dual Strategy**: Rate limit theo IP và User ID

### 7. 📋 Bảng `system_logs`

**Mục đích**: Ghi log hệ thống và audit trail

```prisma
model SystemLog {
  id        Int      @id @default(autoincrement())
  level     LogLevel
  message   String   @db.Text
  meta      Json?
  source    String?
  userId    Int?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

**Chức năng**:

- **Debugging**: Hỗ trợ debug và troubleshooting
- **Security Audit**: Theo dõi hoạt động bảo mật
- **Performance Monitoring**: Giám sát hiệu suất

**Log levels**:

- `ERROR`: Lỗi nghiêm trọng
- `WARN`: Cảnh báo
- `INFO`: Thông tin
- `DEBUG`: Debug information

## Enums và Constants

### Role Enum

```prisma
enum Role {
  USER     // User thường
  PREMIUM  // User premium
  ADMIN    // Quản trị viên
}
```

### ConversionStatus Enum

```prisma
enum ConversionStatus {
  PENDING    // Đang chờ
  PROCESSING // Đang xử lý
  COMPLETED  // Hoàn thành
  FAILED     // Thất bại
  EXPIRED    // Hết hạn
  CANCELLED  // Đã hủy
}
```

### LogLevel Enum

```prisma
enum LogLevel {
  ERROR  // Lỗi
  WARN   // Cảnh báo
  INFO   // Thông tin
  DEBUG  // Debug
}
```

## Indexes và Performance

### Primary Indexes

- Tất cả bảng có primary key auto-increment
- Unique constraints trên email, sessionToken

### Secondary Indexes

```sql
-- Conversion table
CREATE INDEX idx_conversions_user_id ON conversions(userId);
CREATE INDEX idx_conversions_created_at ON conversions(createdAt);
CREATE INDEX idx_conversions_status ON conversions(status);
CREATE INDEX idx_conversions_expires_at ON conversions(expiresAt);
CREATE INDEX idx_conversions_job_id ON conversions(jobId);
CREATE INDEX idx_conversions_ip_address ON conversions(ipAddress);

-- Rate Limit table
CREATE INDEX idx_rate_limits_window_end ON rate_limits(windowEnd);
CREATE INDEX idx_rate_limits_identifier_type ON rate_limits(identifier, type);

-- System Log table
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(createdAt);
CREATE INDEX idx_system_logs_source ON system_logs(source);
```

## Workflow và Data Flow

### 1. User Registration Flow

```
1. Tạo record trong `users` table
2. Nếu OAuth: Tạo record trong `accounts` table
3. Tạo session trong `sessions` table
4. Log hoạt động trong `system_logs`
```

### 2. File Conversion Flow

```
1. Tạo record trong `conversions` với status PENDING
2. Thêm job vào BullMQ queue (lưu jobId)
3. Worker xử lý: Update status → PROCESSING
4. Hoàn thành: Update status → COMPLETED
5. Cleanup: Tự động xóa file hết hạn
```

### 3. Rate Limiting Flow

```
1. Check `rate_limits` table theo IP/User
2. Update requestsCount
3. Nếu vượt limit: Set isBlocked = true
4. Reset counter khi hết window
```

## Migration và Schema Evolution

### Development

```bash
# Tạo migration mới
npx prisma migrate dev --name add_new_feature

# Apply migration
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Production

```bash
# Deploy migration
npx prisma migrate deploy

# Backup trước khi migrate
./scripts/backup-db.sh
```

## Best Practices

### 1. Data Integrity

- Sử dụng foreign key constraints
- Cascade delete cho quan hệ parent-child
- Default values cho tất cả nullable fields

### 2. Performance

- Index các cột thường query
- Partition log tables theo thời gian
- Regular cleanup expired data

### 3. Security

- Hash passwords với bcrypt
- Encrypt sensitive tokens
- Audit trail cho admin actions

### 4. Backup Strategy

- Daily automated backups
- Point-in-time recovery capability
- Test restore procedures regularly

## Troubleshooting

### Common Issues

1. **Connection Pool Exhausted**

   ```javascript
   // Increase pool size in Prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Migration Conflicts**

   ```bash
   # Reset migration state
   npx prisma migrate reset
   npx prisma migrate dev
   ```

3. **Performance Issues**

   ```sql
   -- Check slow queries
   SHOW PROCESSLIST;

   -- Analyze table performance
   EXPLAIN SELECT * FROM conversions WHERE userId = 1;
   ```

### Monitoring Queries

```sql
-- Active connections
SELECT * FROM information_schema.PROCESSLIST;

-- Table sizes
SELECT
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'convert_db'
ORDER BY (data_length + index_length) DESC;

-- Recent conversions
SELECT status, COUNT(*) as count
FROM conversions
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY status;
```

---

_Tài liệu này được cập nhật lần cuối: May 31, 2025_
_Phiên bản Database Schema: 1.0_
