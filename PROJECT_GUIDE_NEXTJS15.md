# Website Chuyển Đổi File - Hướng Dẫn Xây Dựng (Next.js 15)

## 📋 Tổng Quan Dự Án

Website chuyển đổi file đa định dạng với hệ thống quản trị admin bao gồm:

### Chức năng chính:

- **Chuyển đổi file**: SVG ↔ PNG, SVG ↔ JPG, SVG ↔ PDF, EPS ↔ SVG, EPS ↔ PNG
- **Hệ thống admin**: Quản lý người dùng, giới hạn sử dụng, bảo vệ hệ thống
- **Frontend**: Giao diện thân thiện cho người dùng

## 🛠️ Công Nghệ Stack (2025)

### Backend

- **Node.js 20+ + Express.js** - API server
- **Database**: MySQL 8.0+ (production-ready)
- **ORM**: Prisma ORM (type-safe database access)
- **File Processing**:
  - `sharp` - xử lý ảnh SVG/PNG/JPG
  - `pdf2pic`, `pdf-lib` - xử lý PDF
  - `canvas` - render SVG
  - `imagemagick` - xử lý EPS (command line)
  - `potrace` - bitmap to SVG tracing
- **Authentication**: NextAuth.js v5 (Auth.js)
- **File Storage**: Local storage với cleanup tự động
- **Queue**: BullMQ với Redis (background jobs)

### Frontend

- **Next.js 15** với App Router & Turbopack
- **React 19** - Latest features (use hook, etc.)
- **TypeScript 5.0+** - Type safety
- **Tailwind CSS v4** - Modern styling
- **shadcn/ui v2** - Component library
- **React Hook Form + Zod** - Form validation
- **Zustand v5** - State management
- **React Dropzone** - File upload interface

### Admin Dashboard

- **Next.js 15 Admin** tích hợp trong cùng project
- **Recharts v2** - Dashboard charts
- **TanStack Table v8** - Data tables
- **shadcn/ui components** - Consistent UI

### Deployment (aaPanel VPS)

- **PM2** - Process manager & clustering
- **Nginx** - Reverse proxy (có sẵn trong aaPanel)
- **Node.js 20+** - Runtime environment
- **MySQL 8.0** - Database server
- **Redis 7+** - Cache & queue
- **Winston** - Logging system
- **Let's Encrypt** - SSL certificate (qua aaPanel)

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 15    │    │   Admin Panel   │    │   Local Storage │
│   (Frontend)    │    │ (Built-in Next) │    │   + Cleanup     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
               ┌─────────────────────────────────┐
               │      Next.js 15 API Routes      │
               │   (Rate Limit + Validation)     │
               └─────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Service   │    │ Convert Service │    │  Admin Service  │
│(NextAuth.js v5) │    │ (BullMQ Jobs)   │    │ (User Mgmt)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
               ┌─────────────────────────────────┐
               │         MySQL Database          │
               │      (Prisma ORM + Redis)       │
               └─────────────────────────────────┘
```

**Deployment trên aaPanel VPS:**

```
Internet → Nginx (aaPanel) → PM2 (Cluster) → Next.js 15 App
                           ↓
                    MySQL + Redis + Local Files
```

## 📝 Các Bước Thực Hiện

### Phase 1: Setup Dự Án (1-2 ngày)

1. **Khởi tạo project structure**

```bash
mkdir convert-svg-website
cd convert-svg-website
mkdir backend uploads logs
```

2. **Setup Backend API với Express + Prisma**

```bash
cd backend
npm init -y
npm install express cors helmet morgan bcryptjs jsonwebtoken
npm install multer sharp pdf2pic canvas
npm install prisma @prisma/client mysql2
npm install bullmq redis ioredis express-rate-limit
npm install winston express-validator compression
npm install --save-dev nodemon typescript @types/node @types/express prisma
```

3. **Setup Next.js 15 Frontend**

```bash
cd ..
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --turbopack
cd frontend
npm install next@15 react@19 react-dom@19
npm install @hookform/resolvers react-hook-form zod
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install zustand axios react-dropzone @tanstack/react-table
npm install next-auth@beta @auth/prisma-adapter
npx shadcn@latest init
npx shadcn@latest add button input card dialog progress toast
npx shadcn@latest add table dropdown-menu select checkbox
```

4. **Cấu trúc thư mục**

```
convert-svg-website/
├── backend/                 # Express API
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, rate limit, validation
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── jobs/           # BullMQ job processors
│   │   └── utils/           # Helper functions
│   ├── uploads/             # Temporary file storage
│   ├── package.json
│   └── server.js
├── frontend/                # Next.js 15 App
│   ├── src/
│   │   ├── app/            # App Router (Next.js 15)
│   │   │   ├── admin/      # Admin panel pages
│   │   │   ├── convert/    # Conversion pages
│   │   │   ├── api/        # API routes (auth endpoints)
│   │   │   └── auth/       # Auth pages
│   │   ├── components/     # UI Components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── forms/      # Form components
│   │   │   └── admin/      # Admin components
│   │   ├── lib/           # Utils & Config
│   │   ├── stores/        # Zustand stores
│   │   └── auth.ts        # NextAuth.js config
│   ├── auth.config.ts     # Auth configuration
│   └── package.json
├── logs/                   # Application logs
└── ecosystem.config.js     # PM2 configuration
```

### Phase 2: Database Setup với Prisma + MySQL (2-3 ngày)

1. **Prisma Schema Configuration**

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  password    String?  // Nullable for OAuth users
  name        String?
  image       String?
  role        Role     @default(USER)
  dailyLimit  Int      @default(10)
  usedToday   Int      @default(0)
  resetDate   DateTime @default(now()) @db.Date
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  conversions Conversion[]
  accounts    Account[]
  sessions    Session[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            Int
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       Int
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Conversion {
  id               Int               @id @default(autoincrement())
  userId           Int?
  fromFormat       String
  toFormat         String
  originalFilename String?
  fileSize         Int?
  ipAddress        String?
  status           ConversionStatus  @default(PENDING)
  errorMessage     String?           @db.Text
  processingTime   Int?              // in milliseconds
  downloadUrl      String?
  expiresAt        DateTime?
  createdAt        DateTime          @default(now())

  // Relations
  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
  @@index([status])
  @@index([expiresAt])
  @@map("conversions")
}

model Setting {
  key         String   @id
  value       String   @db.Text
  description String?
  updatedAt   DateTime @updatedAt

  @@map("settings")
}

model RateLimit {
  ipAddress     String   @id
  requestsCount Int      @default(0)
  resetTime     DateTime
  createdAt     DateTime @default(now())

  @@index([resetTime])
  @@map("rate_limits")
}

enum Role {
  USER
  PREMIUM
  ADMIN
}

enum ConversionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  EXPIRED
}
```

2. **Database Setup Commands**

```bash
# Setup environment
echo "DATABASE_URL=\"mysql://username:password@localhost:3306/convert_db\"" > .env

# Initialize Prisma
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

### Phase 3: Next.js 15 với React 19 Features (2-3 ngày)

1. **NextAuth.js v5 Configuration**

```typescript
// frontend/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const authConfig = {
  pages: {
    signIn: "/auth/login",
    signUp: "/auth/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        return isLoggedIn && auth.user.role === "ADMIN";
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const response = await fetch(`${process.env.API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          return await response.json();
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
```

2. **Next.js 15 API Routes với async request APIs**

```typescript
// frontend/src/app/api/convert/route.ts
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Rate limiting check
    const ip = request.ip || "unknown";
    const rateLimit = await checkRateLimit(ip, session?.user);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fromFormat = formData.get("fromFormat") as string;
    const toFormat = formData.get("toFormat") as string;

    // Validate file
    if (!file || !fromFormat || !toFormat) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Process conversion
    const result = await processConversion({
      file,
      fromFormat,
      toFormat,
      userId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

3. **React 19 Components với async/await**

```typescript
// frontend/src/app/convert/page.tsx
import { auth } from "@/auth";
import { ConversionTool } from "@/components/conversion-tool";
import { Suspense } from "react";

export default async function ConvertPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">File Conversion Tool</h1>

      <Suspense fallback={<div>Loading conversion tool...</div>}>
        <ConversionTool
          user={session?.user}
          defaultFromFormat={resolvedSearchParams.from as string}
          defaultToFormat={resolvedSearchParams.to as string}
        />
      </Suspense>
    </main>
  );
}
```

4. **Modern File Upload Component với React 19**

```typescript
// frontend/src/components/file-upload.tsx
"use client";

import { useDropzone } from "react-dropzone";
import { useState, useTransition, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Upload, FileType, Download } from "lucide-react";

interface FileUploadProps {
  acceptedFormats: string[];
  onConversion: (
    file: File,
    fromFormat: string,
    toFormat: string
  ) => Promise<any>;
}

export function FileUpload({ acceptedFormats, onConversion }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<any>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/svg+xml": [".svg"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
      "application/postscript": [".eps"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setResult(null);
    },
  });

  const handleConvert = async (fromFormat: string, toFormat: string) => {
    if (!files[0]) return;

    startTransition(async () => {
      try {
        const result = await onConversion(files[0], fromFormat, toFormat);
        setResult(result);
      } catch (error) {
        console.error("Conversion failed:", error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports: SVG, PNG, JPG, PDF, EPS (max 50MB)
                </p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Selected File:</h3>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <FileType className="h-4 w-4" />
                <span className="text-sm">{files[0].name}</span>
                <span className="text-xs text-gray-500">
                  ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>
          )}

          {isPending && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                Converting... {progress}%
              </p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-800">Conversion completed!</span>
                <Button asChild variant="outline" size="sm">
                  <a href={result.downloadUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Phase 4: BullMQ + Redis Job Queue (2 ngày)

1. **Job Queue Setup**

```typescript
// backend/src/services/queueService.ts
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: 3,
});

export const conversionQueue = new Queue("conversion", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

interface ConversionJobData {
  conversionId: number;
  inputPath: string;
  outputPath: string;
  fromFormat: string;
  toFormat: string;
  userId?: number;
}

export class QueueService {
  static async addConversionJob(data: ConversionJobData) {
    return await conversionQueue.add("convert-file", data, {
      priority: data.userId ? 1 : 10, // Registered users get priority
    });
  }

  static async getJobStatus(jobId: string) {
    const job = await Job.fromId(conversionQueue, jobId);
    if (!job) return null;

    return {
      id: job.id,
      progress: job.progress,
      status: await job.getState(),
      data: job.data,
      failedReason: job.failedReason,
    };
  }
}
```

### Phase 5: Deployment trên aaPanel VPS (1-2 ngày)

1. **Environment Setup**

```bash
# VPS preparation
sudo apt update
sudo apt install -y nodejs npm mysql-server redis-server
sudo apt install -y ghostscript potrace imagemagick
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# MySQL setup
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE convert_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'convert_user'@'localhost' IDENTIFIED BY 'your_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON convert_db.* TO 'convert_user'@'localhost';"
```

2. **PM2 Ecosystem Configuration**

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
        DATABASE_URL:
          "mysql://convert_user:your_password@localhost:3306/convert_db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        JWT_SECRET: "your-super-secret-jwt-key",
        NEXTAUTH_SECRET: "your-nextauth-secret",
        NEXTAUTH_URL: "https://yourdomain.com",
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_file: "./logs/api-combined.log",
      time: true,
      max_memory_restart: "1G",
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
        DATABASE_URL:
          "mysql://convert_user:your_password@localhost:3306/convert_db",
        NEXTAUTH_SECRET: "your-nextauth-secret",
        NEXTAUTH_URL: "https://yourdomain.com",
        API_URL: "http://localhost:3001",
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_file: "./logs/frontend-combined.log",
      time: true,
    },
    {
      name: "convert-worker",
      script: "./backend/src/jobs/worker.js",
      instances: 2,
      env: {
        NODE_ENV: "production",
        DATABASE_URL:
          "mysql://convert_user:your_password@localhost:3306/convert_db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
      },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      log_file: "./logs/worker-combined.log",
      time: true,
    },
  ],
};
```

3. **Deployment Script**

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Convert SVG Website (Next.js 15)..."

# Stop services
echo "⏹️ Stopping services..."
pm2 stop ecosystem.config.js || true

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --only=production

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy
npx prisma generate

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm ci

# Build frontend (Next.js 15 with Turbopack)
echo "🏗️ Building frontend with Turbopack..."
npm run build

# Start services
echo "🔄 Starting services..."
cd ..
pm2 start ecosystem.config.js

# Wait for services to start
sleep 10

# Cleanup old files
echo "🧹 Cleaning up old files..."
find uploads/ -type f -mtime +1 -delete || true

# Health check
echo "🏥 Running health check..."
curl -f http://localhost:3000/api/health || echo "Warning: Health check failed"

# Check PM2 status
pm2 status

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 API: http://localhost:3001"
echo "📊 PM2 Monitoring: pm2 monit"
echo "📝 Logs: pm2 logs"
```

## 🔒 Security & Performance (Next.js 15)

### Next.js 15 Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
  images: {
    domains: ["localhost"],
    formats: ["image/webp", "image/avif"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## 💰 Cost Estimation (MySQL + Redis)

### VPS Requirements

- **CPU**: 4 cores (recommended)
- **RAM**: 8GB (MySQL + Redis + Node.js)
- **Storage**: 100GB SSD
- **Bandwidth**: 2TB/month
- **Cost**: $40-70/month

## 📅 Development Timeline

### Week 1: Foundation (5 ngày)

- Day 1: Project setup, Next.js 15 + Prisma
- Day 2: Database design, NextAuth.js v5
- Day 3: Basic API routes, authentication
- Day 4-5: File upload & validation

### Week 2: Core Features (5 ngày)

- Day 1-2: Conversion engine + BullMQ
- Day 3-4: Frontend UI với shadcn/ui
- Day 5: Admin dashboard basics

### Week 3: Production Ready (5 ngày)

- Day 1-2: Security, rate limiting, optimization
- Day 3: Testing, bug fixes
- Day 4: VPS deployment, MySQL setup
- Day 5: Monitoring, documentation

**Total: 15 ngày với Next.js 15 + MySQL stack**

---

**🎯 Summary**: Roadmap được cập nhật với Next.js 15, React 19, MySQL database, NextAuth.js v5, và Prisma ORM. Tối ưu cho performance và scalability trên aaPanel VPS với đầy đủ tính năng hiện đại năm 2025.
