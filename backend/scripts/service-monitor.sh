#!/bin/bash

# Script monitor và restart services nếu cần
# Chạy định kỳ để đảm bảo các services luôn hoạt động

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Kiểm tra services..."

# Kiểm tra và restart MySQL nếu cần
if ! systemctl is-active --quiet mysql; then
    log "MySQL không hoạt động, đang restart..."
    systemctl restart mysql
    if systemctl is-active --quiet mysql; then
        log "✅ MySQL đã được restart thành công"
    else
        log "❌ Không thể restart MySQL"
    fi
else
    log "✅ MySQL đang hoạt động"
fi

# Kiểm tra và restart Redis nếu cần
if ! systemctl is-active --quiet redis; then
    log "Redis không hoạt động, đang restart..."
    systemctl restart redis
    if systemctl is-active --quiet redis; then
        log "✅ Redis đã được restart thành công"
    else
        log "❌ Không thể restart Redis"
    fi
else
    log "✅ Redis đang hoạt động"
fi

# Kiểm tra và restart Nginx nếu cần
if ! systemctl is-active --quiet nginx; then
    log "Nginx không hoạt động, đang restart..."
    systemctl restart nginx
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx đã được restart thành công"
    else
        log "❌ Không thể restart Nginx"
    fi
else
    log "✅ Nginx đang hoạt động"
fi

# Kiểm tra PM2 processes
if command -v pm2 &> /dev/null; then
    DEAD_PROCESSES=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "errored" or .pm2_env.status == "stopped") | .name' 2>/dev/null)
    if [ ! -z "$DEAD_PROCESSES" ]; then
        log "Restart dead PM2 processes: $DEAD_PROCESSES"
        echo "$DEAD_PROCESSES" | while read process; do
            pm2 restart "$process"
            log "Restarted: $process"
        done
    else
        log "✅ Tất cả PM2 processes đang hoạt động"
    fi
fi

log "Service monitoring hoàn tất"
