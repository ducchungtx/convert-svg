# Website Chuyển Đổi File - Hướng Dẫn Xây Dựng

## 📋 Tổng Quan Dự Án

Website chuyển đổi file đa định dạng với hệ thống quản trị admin bao gồm:

### Chức năng chính:

- **Chuyển đổi file**: SVG ↔ PNG, SVG ↔ JPG, SVG ↔ PDF, EPS ↔ SVG, EPS ↔ PNG
- **Hệ thống admin**: Quản lý người dùng, giới hạn sử dụng, bảo vệ hệ thống
- **Frontend**: Giao diện thân thiện cho người dùng

## 🛠️ Công Nghệ Stack

### Backend

- **Node.js + Express.js** - API server
- **Database**: SQLite (phù hợp VPS cấu hình thấp) + file-based caching
- **File Processing**:
  - `sharp` - xử lý ảnh SVG/PNG/JPG
  - `pdf2pic`, `pdf-lib` - xử lý PDF
  - `canvas` - render SVG
  - `imagemagick` - xử lý EPS (thông qua command line)
  - `potrace` - bitmap to SVG tracing
- **Authentication**: JWT + bcryptjs
- **File Storage**: Local storage với cleanup tự động

### Frontend

- **Next.js 14+** với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **shadcn/ui** - Component library
- **React Hook Form + Zod** - Form validation
- **Zustand** - State management (nhẹ hơn Redux)
- **React Dropzone** - File upload interface

### Admin Dashboard

- **Next.js Admin** tích hợp trong cùng project
- **Recharts** - Dashboard charts
- **TanStack Table** - Data tables
- **shadcn/ui components** - Consistent UI

### Deployment (aaPanel VPS)

- **PM2** - Process manager & clustering
- **Nginx** - Reverse proxy (có sẵn trong aaPanel)
- **Node.js 18+** - Runtime environment
- **SQLite3** - Database (không cần server riêng)
- **Winston** - Logging system
- **Let's Encrypt** - SSL certificate (qua aaPanel)

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Admin Panel   │    │   Local Storage │
│   (Frontend)    │    │ (Built-in Next) │    │   + Cleanup     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
               ┌─────────────────────────────────┐
               │         Next.js API Routes      │
               │    (Rate Limit + Validation)    │
               └─────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Service   │    │ Convert Service │    │  Admin Service  │
│  (JWT + Cache)  │    │ (File Process)  │    │ (User Mgmt)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
               ┌─────────────────────────────────┐
               │           SQLite Database       │
               │        (Users + Analytics)      │
               └─────────────────────────────────┘
```

**Deployment trên aaPanel VPS:**

```
Internet → Nginx (aaPanel) → PM2 (Cluster) → Next.js App
                           ↓
                       SQLite + Local Files
```

## 📝 Các Bước Thực Hiện

### Phase 1: Setup Dự Án (1-2 ngày)

1. **Khởi tạo project structure**

```bash
mkdir convert-svg-website
cd convert-svg-website
mkdir backend uploads logs
```

2. **Setup Backend API**

```bash
cd backend
npm init -y
npm install express cors helmet morgan bcryptjs jsonwebtoken
npm install multer sharp pdf2pic canvas
npm install sqlite3 better-sqlite3 express-rate-limit
npm install winston express-validator compression
npm install --save-dev nodemon typescript @types/node @types/express
```

3. **Setup Next.js Frontend**

```bash
cd ..
npx create-next-app@latest frontend --typescript --tailwind --eslint --app
cd frontend
npm install @hookform/resolvers react-hook-form zod
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install zustand axios react-dropzone @tanstack/react-table
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog progress toast
npx shadcn-ui@latest add table dropdown-menu select checkbox
```

4. **Cấu trúc thư mục**

```
convert-svg-website/
├── backend/                 # Express API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, rate limit, validation
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper functions
│   ├── uploads/             # Temporary file storage
│   ├── database.sqlite      # SQLite database
│   ├── package.json
│   └── server.js
├── frontend/                # Next.js App
│   ├── src/
│   │   ├── app/            # App Router (Next.js 13+)
│   │   │   ├── admin/      # Admin panel pages
│   │   │   ├── convert/    # Conversion pages
│   │   │   └── api/        # API routes (if needed)
│   │   ├── components/     # UI Components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── forms/      # Form components
│   │   │   └── admin/      # Admin components
│   │   ├── lib/           # Utils & Config
│   │   └── stores/        # Zustand stores
│   └── package.json
├── logs/                   # Application logs
└── ecosystem.config.js     # PM2 configuration
```

### Phase 2: Backend Core (3-4 ngày)

1. **SQLite Database Schema**

```sql
-- users.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  daily_limit INTEGER DEFAULT 10,
  used_today INTEGER DEFAULT 0,
  reset_date TEXT DEFAULT (date('now')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- conversions.sql
CREATE TABLE conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  from_format TEXT NOT NULL,
  to_format TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  ip_address TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processing_time INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- settings.sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- rate_limits.sql (for IP-based limiting)
CREATE TABLE rate_limits (
  ip_address TEXT PRIMARY KEY,
  requests_count INTEGER DEFAULT 0,
  reset_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_conversions_user ON conversions(user_id);
CREATE INDEX idx_conversions_date ON conversions(created_at);
CREATE INDEX idx_conversions_status ON conversions(status);
CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_time);
```

2. **Core Services Structure**

```javascript
// backend/src/services/
├── authService.js           # JWT + user management
├── conversionService.js     # File format conversion
├── fileService.js          # File upload/cleanup/validation
├── rateLimitService.js     # Usage tracking & limits
├── databaseService.js      # SQLite operations
├── imageService.js         # Image processing (sharp)
├── pdfService.js          # PDF processing
└── cleanupService.js      # Scheduled cleanup tasks
```

3. **API Routes Structure**

```javascript
// Express routes
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/logout

POST /api/convert/svg-to-png
POST /api/convert/png-to-svg
POST /api/convert/svg-to-jpg
POST /api/convert/jpg-to-svg
POST /api/convert/svg-to-pdf
POST /api/convert/pdf-to-svg
POST /api/convert/eps-to-svg
POST /api/convert/eps-to-png
GET  /api/convert/status/:jobId
GET  /api/convert/download/:fileId

GET  /api/user/usage
GET  /api/user/history
DELETE /api/user/history/:id

GET  /api/admin/dashboard
GET  /api/admin/users
PUT  /api/admin/users/:id/limit
GET  /api/admin/conversions
GET  /api/admin/stats
GET  /api/admin/system-health
PUT  /api/admin/settings
```

### Phase 3: File Conversion Engine (2-3 ngày)

1. **Conversion Services Implementation**

**SVG to PNG/JPG:**

```javascript
// imageService.js
const sharp = require("sharp");
const { createCanvas, loadImage } = require("canvas");

async function svgToPng(svgBuffer, width = 800, height = 600) {
  return await sharp(svgBuffer).resize(width, height).png().toBuffer();
}
```

**PNG/JPG to SVG (Tracing):**

```javascript
// Sử dụng potrace command line tool
const { exec } = require("child_process");

async function bitmapToSvg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(
      `potrace ${inputPath} -s -o ${outputPath}`,
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(outputPath);
      }
    );
  });
}
```

**PDF to SVG:**

```javascript
const pdf2pic = require("pdf2pic");

async function pdfToSvg(pdfBuffer) {
  const convert = pdf2pic.fromBuffer(pdfBuffer, {
    density: 100,
    saveFilename: "untitled",
    savePath: "./temp",
    format: "svg",
    width: 600,
    height: 600,
  });

  return await convert(1); // Convert first page
}
```

**EPS Processing:**

```javascript
// Sử dụng ImageMagick command line
async function epsToSvg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`convert ${inputPath} ${outputPath}`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(outputPath);
    });
  });
}
```

2. **File Management & Security**

- File type validation với magic numbers
- File size limits (50MB default)
- Virus scanning integration (ClamAV)
- Automatic cleanup của temporary files
- Progress tracking cho conversion jobs

### Phase 4: Frontend Development (3-4 ngày)

1. **Main Pages Structure**

```
app/
├── page.tsx                 # Homepage
├── convert/
│   ├── page.tsx            # Conversion tool
│   └── [type]/page.tsx     # Specific conversion pages
├── dashboard/
│   ├── page.tsx            # User dashboard
│   └── history/page.tsx    # Conversion history
├── admin/
│   ├── page.tsx            # Admin dashboard
│   ├── users/page.tsx      # User management
│   ├── stats/page.tsx      # Analytics
│   └── settings/page.tsx   # System settings
└── auth/
    ├── login/page.tsx      # Login page
    └── register/page.tsx   # Registration
```

2. **Core Components**

**File Upload Component:**

```typescript
// components/FileUpload.tsx
import { useDropzone } from "react-dropzone";
import { useState } from "react";

export function FileUpload({ onFileSelect, acceptedFormats }) {
  const [files, setFiles] = useState([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedFormats,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      onFileSelect(acceptedFiles[0]);
    },
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6"
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag & drop files here, or click to select files</p>
      )}
    </div>
  );
}
```

**Conversion Progress:**

```typescript
// components/ConversionProgress.tsx
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export function ConversionProgress({ jobId }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/convert/status/${jobId}`);
      const data = await response.json();
      setProgress(data.progress);
      setStatus(data.status);

      if (data.status === "completed" || data.status === "failed") {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="space-y-2">
      <Progress value={progress} className="w-full" />
      <p className="text-sm text-gray-600">
        Status: {status} ({progress}%)
      </p>
    </div>
  );
}
```

3. **State Management với Zustand**

```typescript
// stores/conversionStore.ts
import { create } from "zustand";

interface ConversionState {
  files: File[];
  currentJob: string | null;
  history: any[];
  setFiles: (files: File[]) => void;
  setCurrentJob: (jobId: string | null) => void;
  addToHistory: (conversion: any) => void;
}

export const useConversionStore = create<ConversionState>((set) => ({
  files: [],
  currentJob: null,
  history: [],
  setFiles: (files) => set({ files }),
  setCurrentJob: (currentJob) => set({ currentJob }),
  addToHistory: (conversion) =>
    set((state) => ({ history: [conversion, ...state.history] })),
}));
```

### Phase 5: Admin Dashboard (2-3 ngày)

1. **Dashboard Components**

**Stats Overview:**

```typescript
// components/admin/StatsOverview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatsOverview({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Daily Conversions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.dailyConversions}</div>
        </CardContent>
      </Card>
      {/* More stat cards */}
    </div>
  );
}
```

**User Management Table:**

```typescript
// components/admin/UserTable.tsx
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function UserTable({ users, onUpdateLimit }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Daily Limit</TableHead>
          <TableHead>Used Today</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>{user.daily_limit}</TableCell>
            <TableCell>{user.used_today}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateLimit(user.id)}
              >
                Edit Limit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Phase 6: Security & Optimization (2-3 ngày)

1. **Security Measures**

**Input Validation:**

```javascript
// middleware/validation.js
const { body, validationResult } = require("express-validator");

const validateConversion = [
  body("fromFormat").isIn(["svg", "png", "jpg", "pdf", "eps"]),
  body("toFormat").isIn(["svg", "png", "jpg", "pdf", "eps"]),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
```

**Rate Limiting:**

```javascript
// middleware/rateLimit.js
const rateLimit = require("express-rate-limit");

const conversionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many conversion requests, try again later.",
});
```

**File Security:**

```javascript
// utils/fileValidator.js
const fileType = require("file-type");

async function validateFile(buffer) {
  const type = await fileType.fromBuffer(buffer);
  const allowedTypes = [
    "image/svg+xml",
    "image/png",
    "image/jpeg",
    "application/pdf",
  ];

  if (!type || !allowedTypes.includes(type.mime)) {
    throw new Error("Invalid file type");
  }

  return type;
}
```

2. **Performance Optimization**

**Caching Strategy:**

```javascript
// services/cacheService.js
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

function getCachedResult(key) {
  return cache.get(key);
}

function setCachedResult(key, data) {
  cache.set(key, data);
}
```

**Background Jobs:**

```javascript
// services/jobQueue.js
const Queue = require("bull");
const conversionQueue = new Queue("conversion processing");

conversionQueue.process(async (job) => {
  const { inputPath, outputPath, fromFormat, toFormat } = job.data;

  // Process conversion
  await processConversion(inputPath, outputPath, fromFormat, toFormat);

  // Cleanup temp files
  await cleanupFiles([inputPath]);
});
```

### Phase 7: Deployment trên aaPanel VPS (1-2 ngày)

1. **Chuẩn bị VPS**

```bash
# Cài đặt Node.js 18+ qua aaPanel Node.js Manager
# Hoặc manual installation
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt PM2 global
npm install -g pm2

# Cài đặt các dependencies cho file processing
sudo apt update
sudo apt install ghostscript potrace imagemagick
sudo apt install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

2. **Upload & Deploy**

```bash
# Upload code lên VPS qua aaPanel File Manager hoặc Git
git clone https://github.com/yourusername/convert-svg-website.git
cd convert-svg-website

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install

# Build Next.js production
cd frontend && npm run build

# Set up environment variables
cp .env.example .env
# Edit .env với các thông tin cần thiết
```

3. **PM2 Configuration**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "convert-api",
      script: "./backend/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        JWT_SECRET: "your-jwt-secret",
        DATABASE_PATH: "./backend/database.sqlite",
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_file: "./logs/api-combined.log",
      time: true,
    },
    {
      name: "convert-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_file: "./logs/frontend-combined.log",
      time: true,
    },
  ],
};
```

4. **Nginx Configuration (trong aaPanel)**

```nginx
# Site config cho domain của bạn
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_proxied any;
        gzip_comp_level 6;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Upload size limit
        client_max_body_size 50M;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files & uploads
    location /uploads {
        alias /path/to/your/uploads;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Security - Block access to sensitive files
    location ~ /\.(env|git|svn) {
        deny all;
        return 404;
    }
}

# HTTPS redirect (sẽ được aaPanel tự động tạo khi enable SSL)
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Include the above configuration
    # ...
}
```

5. **Deployment & Management Scripts**

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Deploying Convert SVG Website..."

# Stop services
pm2 stop ecosystem.config.js

# Pull latest code
git pull origin main

# Install/update dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install --production

echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Database migration (if needed)
echo "🗄️ Running database migrations..."
cd ../backend && npm run migrate

# Restart services with PM2
echo "🔄 Restarting services..."
pm2 restart ecosystem.config.js

# Cleanup old files (older than 24 hours)
echo "🧹 Cleaning up old files..."
find uploads/ -type f -mtime +1 -delete

# Check service status
pm2 status

echo "✅ Deployment completed!"
echo "📊 Check logs: pm2 logs"
echo "🌐 Access: https://yourdomain.com"
```

```bash
#!/bin/bash
# backup.sh

echo "💾 Creating backup..."

# Create backup directory with timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
cp backend/database.sqlite $BACKUP_DIR/

# Backup uploads (if needed)
tar -czf $BACKUP_DIR/uploads.tar.gz uploads/

# Backup environment files
cp .env $BACKUP_DIR/

echo "✅ Backup created: $BACKUP_DIR"
```

6. **Monitoring & Maintenance**

**Crontab Setup:**

```bash
# crontab -e
# Cleanup temporary files every hour
0 * * * * cd /path/to/your/app && find uploads/ -type f -mtime +1 -delete

# Daily backup
0 2 * * * cd /path/to/your/app && ./backup.sh

# Reset daily usage counters at midnight
0 0 * * * cd /path/to/your/app/backend && node scripts/resetDailyUsage.js

# System health check every 15 minutes
*/15 * * * * cd /path/to/your/app && pm2 status > /dev/null || pm2 restart ecosystem.config.js
```

**System Health Check Script:**

```javascript
// scripts/healthCheck.js
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");

async function healthCheck() {
  const checks = {
    database: false,
    diskSpace: false,
    uploads: false,
    logs: false,
  };

  try {
    // Database check
    const db = new sqlite3.Database("./database.sqlite");
    await new Promise((resolve, reject) => {
      db.get("SELECT 1", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    checks.database = true;
    db.close();

    // Disk space check (warn if less than 1GB)
    const stats = fs.statSync("./");
    checks.diskSpace = stats.size > 1024 * 1024 * 1024;

    // Uploads directory check
    checks.uploads = fs.existsSync("./uploads");

    // Logs directory check
    checks.logs = fs.existsSync("./logs");

    console.log("Health Check Results:", checks);
    return checks;
  } catch (error) {
    console.error("Health check failed:", error);
    return checks;
  }
}

if (require.main === module) {
  healthCheck();
}

module.exports = healthCheck;
```

## 🔒 Bảo Mật & Giới Hạn

### Rate Limiting Strategy

- **Guest users (IP-based)**: 5 files/hour
- **Registered users**: 50 files/day
- **Premium users**: 500 files/day
- **File size limit**: 50MB/file
- **Concurrent processing**: Max 3 files per user

### Security Checklist

- ✅ File type validation (magic numbers)
- ✅ File size limits
- ✅ Input sanitization
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (helmet.js)
- ✅ CSRF tokens
- ✅ JWT token expiration
- ✅ Secure headers
- ✅ Rate limiting
- ✅ Error message sanitization
- ✅ Path traversal protection

## 📊 Monitoring & Analytics

### Key Metrics

- **Performance**: Conversion success rate, processing time
- **Usage**: Popular format combinations, peak hours
- **Users**: Registration trends, user activity
- **System**: CPU, memory, disk usage
- **Errors**: Error rates, failure patterns

### Admin Dashboard Features

- Real-time conversion queue status
- Daily/weekly/monthly statistics
- User management interface
- System health monitoring
- Error logs viewer
- Performance metrics

## 💰 Cost Estimation (VPS)

### VPS Requirements (Minimum)

- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: 1TB/month
- **Cost**: $15-25/month

### Recommended VPS Specs

- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Bandwidth**: 2TB/month
- **Cost**: $30-50/month

### Additional Costs

- **Domain**: $10-15/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Backup Storage**: $5-10/month (optional)
- **CDN**: $5-20/month (if needed)

## 📅 Development Timeline

### Week 1: Foundation (5 ngày)

- Day 1-2: Project setup, database design
- Day 3-4: Authentication system, basic API
- Day 5: File upload & validation

### Week 2: Core Features (5 ngày)

- Day 1-2: Conversion engine development
- Day 3-4: Frontend UI components
- Day 5: Admin dashboard basics

### Week 3: Polish & Deploy (5 ngày)

- Day 1-2: Security implementation
- Day 3: Testing & bug fixes
- Day 4: VPS setup & deployment
- Day 5: Monitoring & documentation

**Total: 15 ngày làm việc (3 tuần)**

## 🚀 Go-Live Checklist

### Pre-Launch

- [ ] All conversion formats working
- [ ] Rate limiting configured
- [ ] Security measures implemented
- [ ] Error handling complete
- [ ] Admin panel functional
- [ ] Database backups setup
- [ ] SSL certificate installed
- [ ] Monitoring configured

### Post-Launch

- [ ] Monitor error logs
- [ ] Track user feedback
- [ ] Performance optimization
- [ ] Regular backups
- [ ] Security updates
- [ ] Feature improvements

## 💡 Future Enhancements

### Phase 2 Features

- **Batch conversion** - Multiple files at once
- **API integration** - Developer API keys
- **Advanced options** - Quality settings, custom dimensions
- **Cloud storage** - AWS S3, Google Drive integration
- **Mobile app** - React Native app
- **Payment system** - Premium subscriptions

### Scaling Considerations

- **Horizontal scaling**: Multiple server instances
- **Load balancing**: Nginx upstream
- **Database scaling**: PostgreSQL migration
- **CDN integration**: CloudFlare, AWS CloudFront
- **Microservices**: Separate conversion service

---

**🎯 Kết luận**: Đây là roadmap chi tiết cho việc xây dựng website chuyển đổi file với Node.js + Express.js backend và Next.js + shadcn/ui frontend, được tối ưu cho deployment trên aaPanel VPS với cấu hình thấp. Thời gian hoàn thành ước tính 15-20 ngày làm việc.
