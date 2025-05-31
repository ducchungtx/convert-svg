#!/bin/bash

# Script health check cho monitoring
# Chạy định kỳ để kiểm tra trạng thái hệ thống

# Cấu hình
API_URL="http://localhost:3001"
LOG_FILE="./logs/health-check.log"
ALERT_EMAIL="admin@yourdomain.com"  # Thay đổi email

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Send alert function
send_alert() {
    local message="$1"
    log "ALERT: $message"
    
    # Gửi email (cần cấu hình sendmail hoặc mail command)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "Health Check Alert" $ALERT_EMAIL
    fi
    
    # Hoặc gửi qua webhook (Slack, Discord, etc.)
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"'"$message"'"}' \
    #   YOUR_WEBHOOK_URL
}

log "Bắt đầu health check"

# Kiểm tra API health endpoint
log "Kiểm tra API health..."
if curl -f -s "$API_URL/api/health" > /dev/null; then
    log "✅ API health check passed"
else
    send_alert "❌ API health check failed - $API_URL/api/health"
fi

# Kiểm tra database connection
log "Kiểm tra database connection..."
if curl -f -s "$API_URL/api/health/db" > /dev/null; then
    log "✅ Database connection OK"
else
    send_alert "❌ Database connection failed"
fi

# Kiểm tra Redis connection
log "Kiểm tra Redis connection..."
if curl -f -s "$API_URL/api/health/redis" > /dev/null; then
    log "✅ Redis connection OK"
else
    send_alert "❌ Redis connection failed"
fi

# Kiểm tra disk space
log "Kiểm tra disk space..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    send_alert "❌ Disk usage cao: ${DISK_USAGE}%"
elif [ $DISK_USAGE -gt 80 ]; then
    log "⚠️ Disk usage: ${DISK_USAGE}%"
else
    log "✅ Disk usage: ${DISK_USAGE}%"
fi

# Kiểm tra memory usage
log "Kiểm tra memory usage..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEMORY_USAGE -gt 90 ]; then
    send_alert "❌ Memory usage cao: ${MEMORY_USAGE}%"
elif [ $MEMORY_USAGE -gt 80 ]; then
    log "⚠️ Memory usage: ${MEMORY_USAGE}%"
else
    log "✅ Memory usage: ${MEMORY_USAGE}%"
fi

# Kiểm tra PM2 processes
if command -v pm2 &> /dev/null; then
    log "Kiểm tra PM2 processes..."
    PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null)
    if [ ! -z "$PM2_STATUS" ]; then
        send_alert "❌ PM2 processes không online: $PM2_STATUS"
    else
        log "✅ Tất cả PM2 processes đang online"
    fi
fi

# Kiểm tra log files cho errors
log "Kiểm tra errors trong logs..."
ERROR_COUNT=$(tail -100 ./logs/error.log 2>/dev/null | grep -c "ERROR" || echo "0")
if [ $ERROR_COUNT -gt 10 ]; then
    send_alert "❌ Nhiều errors trong logs: $ERROR_COUNT errors trong 100 dòng cuối"
elif [ $ERROR_COUNT -gt 0 ]; then
    log "⚠️ Có $ERROR_COUNT errors trong logs"
else
    log "✅ Không có errors trong logs"
fi

# Kiểm tra file upload directory
log "Kiểm tra upload directory..."
if [ -d "./uploads" ] && [ -w "./uploads" ]; then
    log "✅ Upload directory OK"
else
    send_alert "❌ Upload directory có vấn đề"
fi

log "Health check hoàn tất"

# Cleanup old health check logs (giữ 30 ngày)
find $(dirname $LOG_FILE) -name "health-check.log.*" -mtime +30 -delete 2>/dev/null || true
