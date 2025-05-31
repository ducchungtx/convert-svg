#!/bin/bash

# Script cleanup files cũ và logs
# Chạy định kỳ: 0 1 * * * /path/to/cleanup.sh

# Cấu hình
UPLOAD_DIR="./uploads"
LOG_DIR="./logs"
RETENTION_DAYS=7
LOG_RETENTION_DAYS=30

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Bắt đầu cleanup process"

# Cleanup uploads cũ
if [ -d "$UPLOAD_DIR" ]; then
    log "Cleanup uploads cũ hơn $RETENTION_DAYS ngày..."
    DELETED_FILES=$(find $UPLOAD_DIR -type f -mtime +$RETENTION_DAYS -print)
    if [ ! -z "$DELETED_FILES" ]; then
        echo "$DELETED_FILES" | while read file; do
            log "Xóa: $file"
            rm -f "$file"
        done
        
        # Xóa thư mục trống
        find $UPLOAD_DIR -type d -empty -delete 2>/dev/null
        
        COUNT=$(echo "$DELETED_FILES" | wc -l)
        log "Đã xóa $COUNT files"
    else
        log "Không có files cũ để xóa"
    fi
fi

# Cleanup logs cũ
if [ -d "$LOG_DIR" ]; then
    log "Cleanup logs cũ hơn $LOG_RETENTION_DAYS ngày..."
    DELETED_LOGS=$(find $LOG_DIR -name "*.log.*" -mtime +$LOG_RETENTION_DAYS -print)
    if [ ! -z "$DELETED_LOGS" ]; then
        echo "$DELETED_LOGS" | while read file; do
            log "Xóa log: $file"
            rm -f "$file"
        done
        
        COUNT=$(echo "$DELETED_LOGS" | wc -l)
        log "Đã xóa $COUNT log files"
    else
        log "Không có log files cũ để xóa"
    fi
    
    # Truncate log files lớn (> 100MB)
    find $LOG_DIR -name "*.log" -size +100M -exec truncate -s 0 {} \;
    log "Đã truncate log files lớn"
fi

# Cleanup temporary files
log "Cleanup temporary files..."
find /tmp -name "tmp*" -user $(whoami) -mtime +1 -delete 2>/dev/null || true

# Cleanup PM2 logs (nếu có)
if command -v pm2 &> /dev/null; then
    log "Flush PM2 logs..."
    pm2 flush
fi

# Disk usage report
log "Disk usage:"
df -h | grep -E "(Filesystem|/$)"

log "Cleanup hoàn tất"
