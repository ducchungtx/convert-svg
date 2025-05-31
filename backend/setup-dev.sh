#!/bin/bash

# Script để thiết lập môi trường development cho macOS
# Sử dụng Docker cho MySQL và Redis
# Chạy: chmod +x setup-dev.sh && ./setup-dev.sh

set -e

echo "🚀 Thiết lập môi trường Development cho File Conversion Backend (macOS)"
echo "========================================================================"

# Kiểm tra hệ điều hành
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️ Script này được thiết kế cho macOS. Cho Linux/Windows, vui lòng tham khảo DEPLOYMENT_GUIDE.md"
fi

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt. Vui lòng cài đặt Node.js 20+ trước."
    echo "Cài đặt: brew install node hoặc https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "20" ]; then
    echo "❌ Node.js version cần >= 20. Hiện tại: $(node -v)"
    echo "Cài đặt: brew install node@20"
    exit 1
fi

echo "✅ Node.js $(node -v) đã được cài đặt"

# Kiểm tra npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm chưa được cài đặt"
    exit 1
fi

echo "✅ npm $(npm -v) đã được cài đặt"

# Kiểm tra Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được cài đặt"
    echo "Cài đặt Docker Desktop: brew install --cask docker"
    echo "Hoặc tải từ: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker chưa chạy. Vui lòng khởi động Docker Desktop"
    echo "macOS: open -a Docker"
    exit 1
fi

echo "✅ Docker đã được cài đặt và đang chạy"

# Kiểm tra docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose chưa được cài đặt"
    echo "Cài đặt: brew install docker-compose"
    exit 1
fi

echo "✅ docker-compose $(docker-compose --version) đã được cài đặt"

# Cài đặt dependencies
echo "📦 Cài đặt Node.js dependencies..."
npm install

# Kiểm tra ImageMagick
echo "🔍 Kiểm tra ImageMagick..."
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick chưa được cài đặt"
    echo "Cài đặt: brew install imagemagick"
    exit 1
fi

echo "✅ ImageMagick đã được cài đặt"

# Kiểm tra Ghostscript
echo "🔍 Kiểm tra Ghostscript..."
if ! command -v gs &> /dev/null; then
    echo "❌ Ghostscript chưa được cài đặt"
    echo "Cài đặt: brew install ghostscript"
    exit 1
fi

echo "✅ Ghostscript đã được cài đặt"

# Kiểm tra các tools khác
echo "🔍 Kiểm tra PDF conversion tools..."
if ! command -v pdf2svg &> /dev/null; then
    echo "❌ pdf2svg chưa được cài đặt"
    echo "Cài đặt: brew install pdf2svg"
    exit 1
fi

if ! command -v potrace &> /dev/null; then
    echo "❌ potrace chưa được cài đặt"
    echo "Cài đặt: brew install potrace"
    exit 1
fi

echo "✅ PDF conversion tools đã được cài đặt"

# Tạo thư mục cần thiết
echo "📁 Tạo thư mục cần thiết..."
mkdir -p uploads
mkdir -p logs

# Khởi động Docker containers
echo "🐳 Khởi động MySQL và Redis containers..."
cd ..
docker-compose -f docker-compose.dev.yml up -d

# Đợi containers sẵn sàng
echo "⏳ Đợi containers khởi động..."
sleep 15

# Kiểm tra containers
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✅ Docker containers đã khởi động thành công"
else
    echo "❌ Có lỗi với Docker containers"
    docker-compose -f docker-compose.dev.yml logs
    exit 1
fi

cd backend

# Cấu hình environment
if [ ! -f .env ]; then
    echo "⚙️ Tạo file .env từ template..."
    cp .env.example .env
    
    # Cập nhật .env cho Docker
    sed -i '' 's/localhost/127.0.0.1/g' .env
    sed -i '' 's/your_password/dev_password/g' .env
    
    echo "✅ File .env đã được tạo và cấu hình cho Docker"
else
    echo "✅ File .env đã tồn tại"
fi

# Test kết nối MySQL
echo "🔍 Kiểm tra kết nối MySQL..."
if mysql -h 127.0.0.1 -P 3306 -u convert_user -pdev_password convert_db -e "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ MySQL connection thành công"
else
    echo "❌ MySQL connection thất bại"
    echo "Kiểm tra logs: docker-compose -f ../docker-compose.dev.yml logs mysql-dev"
fi

# Test kết nối Redis
echo "🔍 Kiểm tra kết nối Redis..."
if redis-cli -h 127.0.0.1 -p 6379 ping > /dev/null 2>&1; then
    echo "✅ Redis connection thành công"
else
    echo "❌ Redis connection thất bại"
    echo "Kiểm tra logs: docker-compose -f ../docker-compose.dev.yml logs redis-dev"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
read -p "Chạy database migrations? (y/n): " RUN_MIGRATIONS
if [ "$RUN_MIGRATIONS" = "y" ] || [ "$RUN_MIGRATIONS" = "Y" ]; then
    npx prisma migrate dev --name init
    echo "✅ Database migrations đã được chạy"
fi

# Seed database
read -p "Seed database với dữ liệu mẫu? (y/n): " SEED_DB
if [ "$SEED_DB" = "y" ] || [ "$SEED_DB" = "Y" ]; then
    npm run seed
    echo "✅ Database đã được seed"
fi

echo ""
echo "🎉 Thiết lập hoàn tất!"
echo "=============================="
echo "✅ Docker containers đang chạy:"
echo "   - MySQL: localhost:3306"
echo "   - Redis: localhost:6379"
echo "   - phpMyAdmin: http://localhost:8080"
echo "   - Redis Commander: http://localhost:8081"
echo ""
echo "Để start development server:"
echo "  npm run dev"
echo ""
echo "Để start worker (terminal khác):"
echo "  npm run worker"
echo ""
echo "Để mở Prisma Studio:"
echo "  npm run studio"
echo ""
echo "API sẽ chạy tại: http://localhost:3001"
echo "Health check: http://localhost:3001/api/health"
echo ""
echo "Để stop containers khi không dùng:"
echo "  docker-compose -f ../docker-compose.dev.yml down"
echo ""
echo "Để xem logs containers:"
echo "  docker-compose -f ../docker-compose.dev.yml logs -f"
