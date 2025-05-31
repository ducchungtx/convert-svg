#!/bin/bash

# Script quản lý Docker development environment
# Chạy: chmod +x docker-dev.sh && ./docker-dev.sh [command]

set -e

COMPOSE_FILE="../docker-compose.dev.yml"

case "$1" in
    "start"|"up")
        echo "🐳 Khởi động development containers..."
        docker-compose -f $COMPOSE_FILE up -d
        echo "✅ Containers đã khởi động"
        echo "📊 Status:"
        docker-compose -f $COMPOSE_FILE ps
        echo ""
        echo "🔗 Access URLs:"
        echo "   MySQL: localhost:3306"
        echo "   Redis: localhost:6379"
        echo "   phpMyAdmin: http://localhost:8080"
        echo "   Redis Commander: http://localhost:8081"
        ;;
    
    "stop"|"down")
        echo "🛑 Dừng development containers..."
        docker-compose -f $COMPOSE_FILE down
        echo "✅ Containers đã dừng"
        ;;
    
    "restart")
        echo "🔄 Restart development containers..."
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d
        echo "✅ Containers đã restart"
        ;;
    
    "logs")
        if [ -n "$2" ]; then
            echo "📋 Logs cho service: $2"
            docker-compose -f $COMPOSE_FILE logs -f $2
        else
            echo "📋 Logs cho tất cả services:"
            docker-compose -f $COMPOSE_FILE logs -f
        fi
        ;;
    
    "status"|"ps")
        echo "📊 Status của containers:"
        docker-compose -f $COMPOSE_FILE ps
        ;;
    
    "mysql")
        echo "🗄️ Kết nối tới MySQL..."
        mysql -h 127.0.0.1 -P 3306 -u convert_user -pdev_password convert_db
        ;;
    
    "redis")
        echo "🔴 Kết nối tới Redis..."
        redis-cli -h 127.0.0.1 -p 6379
        ;;
    
    "backup")
        echo "💾 Backup database..."
        DATE=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_${DATE}.sql"
        docker exec convert-mysql-dev mysqldump -u root -proot123 convert_db > $BACKUP_FILE
        echo "✅ Database backup: $BACKUP_FILE"
        ;;
    
    "restore")
        if [ -z "$2" ]; then
            echo "❌ Vui lòng chỉ định file backup"
            echo "Usage: $0 restore backup_file.sql"
            exit 1
        fi
        echo "📥 Restore database từ: $2"
        docker exec -i convert-mysql-dev mysql -u root -proot123 convert_db < $2
        echo "✅ Database đã được restore"
        ;;
    
    "clean")
        echo "🧹 Xóa tất cả containers và volumes..."
        read -p "Bạn có chắc chắn? Tất cả data sẽ bị mất! (y/N): " CONFIRM
        if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
            docker-compose -f $COMPOSE_FILE down -v
            docker-compose -f $COMPOSE_FILE down --rmi all
            echo "✅ Đã xóa containers và volumes"
        else
            echo "❌ Hủy bỏ"
        fi
        ;;
    
    "reset")
        echo "🔄 Reset database (xóa và tạo lại)..."
        read -p "Bạn có chắc chắn? Tất cả data sẽ bị mất! (y/N): " CONFIRM
        if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
            docker-compose -f $COMPOSE_FILE down -v
            docker-compose -f $COMPOSE_FILE up -d
            echo "⏳ Đợi containers khởi động..."
            sleep 15
            echo "✅ Database đã được reset"
        else
            echo "❌ Hủy bỏ"
        fi
        ;;
    
    "monitor")
        echo "📊 Monitoring containers..."
        watch -n 2 "docker-compose -f $COMPOSE_FILE ps"
        ;;
    
    *)
        echo "🐳 Docker Development Environment Manager"
        echo "==========================================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start, up     - Khởi động containers"
        echo "  stop, down    - Dừng containers"
        echo "  restart       - Restart containers"
        echo "  status, ps    - Xem status containers"
        echo "  logs [service]- Xem logs (tất cả hoặc service cụ thể)"
        echo "  mysql         - Kết nối tới MySQL CLI"
        echo "  redis         - Kết nối tới Redis CLI"
        echo "  backup        - Backup database"
        echo "  restore <file>- Restore database từ file"
        echo "  clean         - Xóa tất cả containers và volumes"
        echo "  reset         - Reset database (xóa data và tạo lại)"
        echo "  monitor       - Monitor containers realtime"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs mysql-dev"
        echo "  $0 backup"
        echo "  $0 restore backup_20231201_120000.sql"
        ;;
esac
