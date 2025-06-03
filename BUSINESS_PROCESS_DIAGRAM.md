# Sơ đồ Nghiệp vụ và Dữ liệu - Convert SVG Backend

## 📋 Tổng quan Dự án

Dự án **Convert SVG** là một hệ thống web API cho phép người dùng chuyển đổi các định dạng file hình ảnh với nhau, đặc biệt tập trung vào việc chuyển đổi SVG. Hệ thống hỗ trợ nhiều định dạng file và cung cấp các tính năng quản lý người dùng, subscription, rate limiting và admin dashboard.

---

## 🏗️ Kiến trúc Hệ thống

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Frontend<br/>Next.js]
        API_CLIENT[API Clients<br/>External Apps]
    end

    subgraph "API Gateway"
        NGINX[Nginx<br/>Load Balancer]
        MIDDLEWARE[Middleware Layer<br/>Auth, Rate Limit, Validation]
    end

    subgraph "Application Layer"
        AUTH[Authentication<br/>Controller]
        CONV[Conversion<br/>Controller]
        ADMIN[Admin<br/>Controller]
        WORKER[Background<br/>Workers]
    end

    subgraph "Service Layer"
        CONV_SVC[Conversion<br/>Service]
        SUB_SVC[Subscription<br/>Helper]
    end

    subgraph "Data Layer"
        MYSQL[(MySQL<br/>Database)]
        REDIS[(Redis<br/>Cache & Queue)]
        FILES[File Storage<br/>Local/Cloud]
    end

    WEB --> NGINX
    API_CLIENT --> NGINX
    NGINX --> MIDDLEWARE
    MIDDLEWARE --> AUTH
    MIDDLEWARE --> CONV
    MIDDLEWARE --> ADMIN

    AUTH --> MYSQL
    AUTH --> REDIS
    CONV --> WORKER
    CONV --> MYSQL
    ADMIN --> MYSQL

    WORKER --> CONV_SVC
    WORKER --> REDIS
    CONV_SVC --> FILES

    CONV --> SUB_SVC
    SUB_SVC --> MYSQL
```

---

## 🔄 Sơ đồ Nghiệp vụ Chính

### 1. Quy trình Đăng ký và Xác thực

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Server
    participant DB as Database
    participant REDIS as Redis Cache

    Note over U,REDIS: User Registration Flow

    U->>API: POST /api/auth/register
    API->>API: Validate input data
    API->>DB: Check if email exists
    alt Email exists
        API->>U: 409 - User already exists
    else New user
        API->>API: Hash password
        API->>DB: Create user record
        API->>API: Generate JWT & Refresh tokens
        API->>REDIS: Store refresh token
        API->>U: 201 - Registration success + tokens
    end

    Note over U,REDIS: User Login Flow

    U->>API: POST /api/auth/login
    API->>API: Validate credentials
    API->>DB: Find user by email
    API->>API: Verify password
    alt Invalid credentials
        API->>U: 401 - Invalid credentials
    else Valid login
        API->>DB: Update last login
        API->>API: Generate new tokens
        API->>REDIS: Store refresh token
        API->>U: 200 - Login success + tokens
    end
```

### 2. Quy trình Chuyển đổi File

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Server
    participant QUEUE as Redis Queue
    participant WORKER as Background Worker
    participant CONV as Conversion Service
    participant DB as Database
    participant FS as File System

    Note over U,FS: File Conversion Process

    U->>API: POST /api/conversion/convert (with file)
    API->>API: Validate file & auth
    API->>API: Check subscription limits
    API->>FS: Save uploaded file
    API->>DB: Create conversion record
    API->>QUEUE: Add conversion job
    API->>U: 202 - Conversion started

    QUEUE->>WORKER: Process conversion job
    WORKER->>DB: Update status to PROCESSING
    WORKER->>CONV: Convert file
    CONV->>FS: Read input file
    CONV->>CONV: Perform conversion
    CONV->>FS: Save output file
    CONV->>WORKER: Return result
    WORKER->>DB: Update status to COMPLETED

    loop Progress Tracking
        U->>API: GET /api/conversion/status/:id
        API->>DB: Get conversion status
        API->>U: Return current status & progress
    end

    U->>API: GET /api/conversion/download/:id
    API->>DB: Verify access & completion
    API->>FS: Stream converted file
    API->>U: Download converted file
```

### 3. Quy trình Quản lý Subscription

```mermaid
graph TD
    A[User Registration] --> B[Default: FREE Plan]
    B --> C{User Action}

    C -->|Upgrade| D[Select Plan]
    C -->|Continue Free| E[Use with FREE Limits]

    D --> F[Update Subscription]
    F --> G[Update Limits]
    G --> H[Plan Active]

    E --> I{Daily Limit Check}
    I -->|Within Limit| J[Allow Conversion]
    I -->|Exceed Limit| K[Block & Suggest Upgrade]

    H --> L{Usage Tracking}
    L -->|Within Limits| J
    L -->|Exceed Limits| M[Block Based on Plan]

    subgraph "Subscription Plans"
        FREE_PLAN[FREE: 10/day, 100/month]
        BASIC_PLAN[BASIC: 50/day, 1000/month]
        PREMIUM_PLAN[PREMIUM: 200/day, 5000/month]
        ENTERPRISE_PLAN[ENTERPRISE: 1000/day, 25000/month]
    end
```

---

## 🗄️ Sơ đồ Cơ sở Dữ liệu

### ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    User ||--o{ Conversion : "owns"
    User ||--o{ Account : "has"
    User ||--o{ Session : "has"

    User {
        int id PK
        string email UK
        string password
        string name
        string image
        enum role
        int dailyLimit
        int usedToday
        datetime resetDate
        boolean isActive
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
        int monthlyLimit
        datetime subscriptionEnd
        datetime subscriptionStart
        enum subscriptionStatus
        enum subscriptionType
        int usedThisMonth
    }

    Account {
        string id PK
        int userId FK
        string type
        string provider
        string providerAccountId
        text refresh_token
        text access_token
        int expires_at
        string token_type
        string scope
        text id_token
        string session_state
    }

    Session {
        string id PK
        string sessionToken UK
        int userId FK
        datetime expires
    }

    Conversion {
        int id PK
        int userId FK
        string jobId UK
        string fromFormat
        string toFormat
        string originalFilename
        string convertedFilename
        int fileSize
        int outputFileSize
        string ipAddress
        text userAgent
        enum status
        int progress
        text errorMessage
        int processingTime
        string downloadUrl
        int downloadCount
        datetime expiresAt
        datetime startedAt
        datetime completedAt
        datetime createdAt
    }

    Setting {
        string key PK
        text value
        text description
        string category
        boolean isPublic
        datetime updatedAt
        int updatedBy
    }

    RateLimit {
        int id PK
        string identifier
        string type
        int requestsCount
        datetime windowStart
        datetime windowEnd
        boolean isBlocked
        datetime createdAt
        datetime updatedAt
    }

    SystemLog {
        int id PK
        enum level
        text message
        json meta
        string source
        int userId
        string ipAddress
        text userAgent
        datetime createdAt
    }
```

### Các Enum Types

```sql
-- Roles
enum Role {
  USER
  PREMIUM
  ADMIN
}

-- Subscription Types
enum SubscriptionType {
  FREE
  BASIC
  PREMIUM
  ENTERPRISE
}

-- Subscription Status
enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  SUSPENDED
}

-- Conversion Status
enum ConversionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  EXPIRED
  CANCELLED
}

-- Log Levels
enum LogLevel {
  ERROR
  WARN
  INFO
  DEBUG
}
```

---

## 🔧 Các Module Chính

### 1. Authentication Module

**Chức năng:**

- Đăng ký, đăng nhập, đăng xuất
- Quản lý JWT tokens và refresh tokens
- Phân quyền theo role (USER, PREMIUM, ADMIN)
- Cập nhật profile và đổi mật khẩu

**Endpoints:**

- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Làm mới token
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/profile` - Lấy thông tin profile
- `PUT /api/auth/profile` - Cập nhật profile
- `PUT /api/auth/password` - Đổi mật khẩu

### 2. Conversion Module

**Chức năng:**

- Upload và validate file
- Chuyển đổi giữa các formats: SVG, PNG, JPG, JPEG, PDF, EPS
- Theo dõi tiến trình conversion
- Download file đã convert
- Quản lý lịch sử conversion

**Endpoints:**

- `GET /api/conversion/supported` - Danh sách formats hỗ trợ
- `POST /api/conversion/convert` - Bắt đầu conversion
- `GET /api/conversion/status/:id` - Kiểm tra trạng thái
- `GET /api/conversion/download/:id` - Download file
- `GET /api/conversion/history` - Lịch sử conversion
- `DELETE /api/conversion/:id` - Xóa conversion

### 3. Admin Module

**Chức năng:**

- Quản lý users (CRUD)
- Thống kê hệ thống
- Quản lý conversions
- Cấu hình hệ thống
- Xem logs hệ thống
- Quản lý queue

**Endpoints:**

- `GET /api/admin/stats` - Thống kê tổng quan
- `GET /api/admin/users` - Danh sách users
- `PUT /api/admin/users/:id` - Cập nhật user
- `DELETE /api/admin/users/:id` - Xóa user
- `GET /api/admin/conversions` - Quản lý conversions
- `GET /api/admin/settings` - Cấu hình hệ thống
- `PUT /api/admin/settings` - Cập nhật cấu hình

### 4. Subscription Module

**Chức năng:**

- Quản lý các gói subscription
- Kiểm tra và cập nhật usage limits
- Theo dõi usage theo ngày/tháng
- Tự động reset counters

**Plans:**

- **FREE**: 10/ngày, 100/tháng
- **BASIC**: 50/ngày, 1000/tháng
- **PREMIUM**: 200/ngày, 5000/tháng
- **ENTERPRISE**: 1000/ngày, 25000/tháng

---

## 🔒 Bảo mật và Middleware

### Authentication Middleware

- Xác thực JWT tokens
- Kiểm tra token blacklist trong Redis
- Optional auth cho anonymous users

### Rate Limiting

- Giới hạn requests theo IP
- Giới hạn theo user
- Lưu trữ trong Redis với sliding window

### File Upload Security

- Validate file types và size
- Sanitize file names
- Scan for malicious content
- Temporary file cleanup

### Authorization Levels

1. **Public** - Không cần auth
2. **User** - Cần đăng nhập
3. **Premium** - Cần subscription Premium+
4. **Admin** - Chỉ admin mới truy cập được

---

## 📊 Monitoring và Logging

### System Logs

- Error tracking
- Performance monitoring
- User activity logs
- Conversion statistics

### Health Checks

- Database connectivity
- Redis connectivity
- File system status
- Queue status

### Metrics Tracked

- Total users by role
- Conversion statistics by format
- Success/failure rates
- System performance metrics
- Storage usage

---

## 🚀 Deployment và Scaling

### Production Setup

- Docker containerization
- Nginx load balancer
- PM2 process manager
- Database replication
- Redis clustering

### Backup Strategy

- Automated database backups
- File storage backup
- Configuration backup
- Log retention policies

### Scaling Considerations

- Horizontal scaling với multiple workers
- CDN cho file delivery
- Database sharding
- Redis cluster cho high availability

---

## 📈 Tối ưu Performance

### Caching Strategy

- JWT token caching
- User session caching
- Conversion status caching
- Static file caching

### Queue Management

- Background job processing
- Job prioritization
- Failed job retry logic
- Job cleanup policies

### File Management

- Temporary file cleanup
- Converted file expiration
- Storage optimization
- CDN integration

---

_Tài liệu này mô tả toàn bộ kiến trúc và quy trình nghiệp vụ của hệ thống Convert SVG Backend. Được cập nhật lần cuối: June 2025_
