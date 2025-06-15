# Hệ thống Quản lý Giới hạn Conversion

## Tổng quan

Hệ thống này cho phép admin quản lý giới hạn conversion dựa trên gói đăng ký và loại người dùng (Guest/User). Hệ thống bao gồm:

1. **Backend API** - Quản lý cấu hình giới hạn
2. **Frontend Admin Dashboard** - Giao diện quản lý cho admin
3. **Guest Limit Integration** - Tích hợp giới hạn cho guest users

## Cấu trúc Database

### Bảng `limit_configurations`

- `subscriptionType`: FREE, BASIC, PREMIUM, ENTERPRISE
- `userType`: USER, GUEST
- `maxFilesPerConversion`: Số file tối đa mỗi lần convert
- `maxFileSize`: Kích thước file tối đa (bytes)
- `maxDailyConversions`: Giới hạn conversion hàng ngày
- `maxMonthlyConversions`: Giới hạn conversion hàng tháng (null = unlimited)
- `allowedFormats`: Danh sách format được phép (JSON array)
- `maxConcurrentJobs`: Số job đồng thời tối đa
- `priorityLevel`: Mức độ ưu tiên (0-10)
- `rateLimitPerMinute`: Giới hạn request/phút
- `rateLimitPerHour`: Giới hạn request/giờ
- `isActive`: Trạng thái hoạt động

## API Endpoints

### Public Endpoints

- `GET /api/guest/limits` - Lấy giới hạn cho guest users

### Admin Endpoints (Yêu cầu authentication)

- `GET /api/admin/limit-configs` - Lấy tất cả cấu hình
- `PUT /api/admin/limit-configs/:subscriptionType/:userType` - Cập nhật cấu hình
- `POST /api/admin/limit-configs/initialize` - Khởi tạo cấu hình mặc định

## Cài đặt và Sử dụng

### 1. Tạo Database Table

```bash
cd backend
mysql -u convert_user -p convert_db < database/migrations/add_limit_configuration_table.sql
```

### 2. Khởi tạo Cấu hình Mặc định

```bash
cd backend
node scripts/init-limit-configs.js
```

### 3. Test Hệ thống

```bash
cd backend
./scripts/test-limit-system.sh
```

### 4. Sử dụng Admin Dashboard

- Truy cập `/admin/limit-configs` trên frontend
- Sử dụng component `LimitConfigurationManager`

## Cấu hình Mặc định

### Guest Users (FREE)

- Max files: 1
- Max file size: 10MB
- Daily limit: 5 conversions
- Monthly limit: 20 conversions
- Formats: PNG, JPG, PDF
- Rate limit: 2/minute, 10/hour

### Registered Users

#### FREE

- Max files: 3
- Max file size: 25MB
- Daily limit: 20 conversions
- Monthly limit: 100 conversions
- Formats: PNG, JPG, PDF, SVG, WebP

#### BASIC

- Max files: 5
- Max file size: 50MB
- Daily limit: 50 conversions
- Monthly limit: 500 conversions
- Formats: PNG, JPG, PDF, SVG, WebP, ICO, BMP

#### PREMIUM

- Max files: 10
- Max file size: 100MB
- Daily limit: 200 conversions
- Monthly limit: Unlimited
- Formats: PNG, JPG, PDF, SVG, WebP, ICO, BMP, TIFF, EPS

#### ENTERPRISE

- Max files: 50
- Max file size: 500MB
- Daily limit: 1000 conversions
- Monthly limit: Unlimited
- Formats: All formats including AI

## Tích hợp Frontend

### Guest Conversion Page

- Tự động lấy giới hạn từ API
- Validation real-time
- Hiển thị thông báo giới hạn

### Admin Dashboard

- Quản lý tất cả cấu hình
- Real-time editing
- Bulk initialization

## Validation Logic

Hệ thống validation kiểm tra:

1. Số lượng file
2. Kích thước file
3. Format hỗ trợ
4. Giới hạn hàng ngày
5. Giới hạn hàng tháng
6. Rate limiting

## Monitoring và Logging

- Tất cả thao tác được log
- Tracking usage per user
- Performance metrics
- Error handling

## Bảo mật

- Admin endpoints yêu cầu authentication
- Validation ở cả frontend và backend
- Rate limiting
- Input sanitization

## Mở rộng

Hệ thống có thể mở rộng:

- Thêm loại user mới
- Thêm subscription type
- Thêm metrics mới
- Custom validation rules
- Integration với payment systems

## Troubleshooting

### Lỗi Database

```bash
# Kiểm tra table tồn tại
mysql -u convert_user -p convert_db -e "SHOW TABLES LIKE 'limit_configurations';"

# Reset configurations
node scripts/init-limit-configs.js
```

### Lỗi API

```bash
# Test API endpoints
curl -X GET http://localhost:3001/api/guest/limits

# Check logs
tail -f backend/logs/combined.log
```

### Lỗi Frontend

```bash
# Check console for errors
# Verify API URL configuration
# Check authentication tokens
```

## Support

Liên hệ team development để hỗ trợ:

- Issues với database migration
- Cấu hình custom limits
- Integration với hệ thống khác
- Performance optimization
