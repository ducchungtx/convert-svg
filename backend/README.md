# 🚀 Quick Setup Guide

## Development Setup (macOS)

### Prerequisites
- Docker Desktop
- Node.js 20+
- Homebrew packages: `brew install imagemagick ghostscript potrace pdf2svg`

### Quick Start

```bash
# 1. Setup development environment
./setup-dev.sh

# 2. Start application
npm run dev

# 3. Start worker (new terminal)
npm run worker
```

### Docker Management

```bash
# Start/stop containers
./docker-dev.sh start
./docker-dev.sh stop

# View logs
./docker-dev.sh logs

# Database access
./docker-dev.sh mysql
./docker-dev.sh redis

# Backup/restore
./docker-dev.sh backup
./docker-dev.sh restore backup_file.sql
```

### Access URLs
- API: http://localhost:3001
- Health Check: http://localhost:3001/api/health
- phpMyAdmin: http://localhost:8080
- Redis Commander: http://localhost:8081

## Production Setup (Ubuntu VPS)

Xem chi tiết trong [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)

### Quick Commands

```bash
# Deploy
./scripts/deploy-production.sh

# Backup
./scripts/backup-db.sh

# Health check
./scripts/health-check.sh

# Cleanup
./scripts/cleanup.sh
```

## Troubleshooting

### Docker Issues
```bash
# Reset everything
./docker-dev.sh clean

# Check status
./docker-dev.sh status

# View all logs
./docker-dev.sh logs
```

### Common Errors
- **Port 3306 already in use**: Stop local MySQL service
- **Docker not running**: Start Docker Desktop
- **Permission denied**: Run `chmod +x *.sh`

## Environment Variables

Development sử dụng Docker:
- MySQL: `127.0.0.1:3306`
- Redis: `127.0.0.1:6379`
- Database: `convert_db`
- User: `convert_user`
- Password: `dev_password`
