#!/bin/bash

# Script backup database tự động
# Thêm vào crontab: 0 2 * * * /path/to/backup-db.sh

# Cấu hình
DB_NAME="convert_db"
DB_USER="convert_user"
DB_PASS="your_password"  # Thay đổi theo production password
BACKUP_DIR="/www/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Tạo thư mục backup nếu chưa có
mkdir -p $BACKUP_DIR

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Bắt đầu backup database: $DB_NAME"

# Tạo backup
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    log "Backup thành công: $BACKUP_FILE"
    
    # Nén file
    gzip $BACKUP_FILE
    COMPRESSED_FILE="$BACKUP_FILE.gz"
    log "Đã nén: $COMPRESSED_FILE"
    
    # Xóa backup cũ (giữ lại theo RETENTION_DAYS)
    find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    log "Đã xóa backup cũ hơn $RETENTION_DAYS ngày"
    
    # Kiểm tra dung lượng
    SIZE=$(du -h $COMPRESSED_FILE | cut -f1)
    log "Kích thước backup: $SIZE"
    
else
    log "❌ Backup thất bại!"
    exit 1
fi

log "Hoàn tất backup"
