# 🔄 File Conversion Website

A modern, full-stack file conversion platform built with **Next.js 15**, **React 19**, and **MySQL**. Convert between multiple file formats including SVG, PNG, JPG, PDF, and EPS with a comprehensive admin management system.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql)
![Prisma](https://img.shields.io/badge/Prisma-2596BE?style=for-the-badge&logo=prisma)

## ✨ Features

### 🔄 File Conversion

- **SVG ↔ PNG** - Vector to raster conversion
- **SVG ↔ JPG** - Vector to JPEG format
- **SVG ↔ PDF** - Vector to document format
- **EPS ↔ SVG** - PostScript to vector conversion
- **EPS ↔ PNG** - PostScript to raster conversion

### 🛡️ User Management

- **Authentication** with NextAuth.js v5 (OAuth + credentials)
- **Role-based access** (User, Premium, Admin)
- **Usage tracking** and rate limiting
- **Daily conversion quotas**

### 👨‍💼 Admin Dashboard

- **Real-time analytics** and conversion statistics
- **User management** with quota adjustments
- **System health monitoring**
- **Conversion history** and logs
- **Settings management**

### 🚀 Performance & Security

- **Background job processing** with BullMQ + Redis
- **File validation** and security scanning
- **Rate limiting** (IP-based and user-based)
- **Automatic file cleanup**
- **CSRF protection** and XSS prevention

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** with App Router & Turbopack
- **React 19** with latest features
- **TypeScript 5.0+** for type safety
- **Tailwind CSS v4** for modern styling
- **shadcn/ui v2** component library
- **Zustand v5** for state management
- **React Hook Form + Zod** for forms

### Backend

- **Node.js 20+ + Express.js** API server
- **MySQL 8.0** with Prisma ORM
- **NextAuth.js v5** for authentication
- **BullMQ + Redis** for job queues
- **Sharp, Canvas, ImageMagick** for file processing

### Deployment

- **PM2** process manager with clustering
- **Nginx** reverse proxy
- **aaPanel VPS** deployment
- **Let's Encrypt** SSL certificates

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 15    │    │   Admin Panel   │    │   File Storage  │
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

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**
- **MySQL 8.0+**
- **Redis 7+**
- **ImageMagick, Potrace, Ghostscript** (for file processing)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/file-conversion-website.git
cd file-conversion-website
```

2. **Setup Backend**

```bash
cd backend
npm install
```

3. **Setup Frontend**

```bash
cd ../frontend
npm install
npx shadcn@latest init
npx shadcn@latest add button input card dialog progress toast table
```

4. **Environment Configuration**

```bash
# Backend .env
cp backend/.env.example backend/.env

# Frontend .env.local
cp frontend/.env.local.example frontend/.env.local
```

5. **Database Setup**

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

6. **Start Development**

```bash
# Terminal 1 - Backend API
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Redis Queue Worker
cd backend && npm run worker
```

7. **Access the application**

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Admin**: http://localhost:3000/admin

## ⚙️ Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/convert_db"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# File Processing
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_DIR="./uploads"
CLEANUP_INTERVAL=3600000  # 1 hour

# API
PORT=3001
NODE_ENV="development"
```

### Frontend (.env.local)

```env
# NextAuth.js
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# API
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Database (shared with backend)
DATABASE_URL="mysql://username:password@localhost:3306/convert_db"
```

## 📁 Project Structure

```
file-conversion-website/
├── backend/                 # Express.js API Server
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation, rate limiting
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── jobs/           # BullMQ job processors
│   │   └── utils/           # Helper functions
│   ├── uploads/             # Temporary file storage
│   └── package.json
│
├── frontend/                # Next.js 15 Application
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   │   ├── admin/      # Admin dashboard
│   │   │   ├── convert/    # Conversion tools
│   │   │   ├── auth/       # Authentication pages
│   │   │   └── api/        # NextAuth.js API routes
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── forms/      # Form components
│   │   │   └── admin/      # Admin-specific components
│   │   ├── lib/           # Utilities and configurations
│   │   ├── stores/        # Zustand state stores
│   │   └── auth.ts        # NextAuth.js configuration
│   └── package.json
│
├── logs/                   # Application logs
├── ecosystem.config.js     # PM2 configuration
└── README.md
```

## 🔒 Security Features

- **File type validation** with magic number checking
- **File size limits** (50MB default)
- **Rate limiting** (IP-based and user-based)
- **Input sanitization** and validation
- **CSRF protection** with NextAuth.js
- **XSS prevention** with secure headers
- **SQL injection protection** with Prisma ORM
- **JWT token expiration** and refresh
- **Automatic file cleanup** for security

## 📊 Rate Limits

| User Type      | Conversions | File Size | Time Window |
| -------------- | ----------- | --------- | ----------- |
| **Guest**      | 5 files     | 10MB      | 1 hour      |
| **Registered** | 50 files    | 50MB      | 1 day       |
| **Premium**    | 500 files   | 100MB     | 1 day       |
| **Admin**      | Unlimited   | 200MB     | -           |

## 🛠️ Development

### Available Scripts

#### Backend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run worker       # Start queue worker
npm run migrate      # Run database migrations
npm run seed         # Seed database
npm run test         # Run tests
```

#### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Browse data
npx prisma studio
```

## 🚀 Production Deployment

### VPS Requirements

- **CPU**: 4 cores (recommended)
- **RAM**: 8GB (MySQL + Redis + Node.js)
- **Storage**: 100GB SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### aaPanel VPS Deployment

1. **Server Preparation**

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
sudo apt update
sudo apt install -y mysql-server redis-server
sudo apt install -y ghostscript potrace imagemagick
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev

# Install PM2
npm install -g pm2
```

2. **Database Setup**

```bash
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE convert_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'convert_user'@'localhost' IDENTIFIED BY 'strong_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON convert_db.* TO 'convert_user'@'localhost';"
```

3. **Application Deployment**

```bash
# Clone and setup
git clone https://github.com/yourusername/file-conversion-website.git
cd file-conversion-website

# Install dependencies
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Edit with production values

# Database migration
cd backend && npx prisma migrate deploy

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

4. **Nginx Configuration** (via aaPanel)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        client_max_body_size 100M;
        proxy_read_timeout 300;
    }
}
```

## 📈 Monitoring

### PM2 Monitoring

```bash
pm2 status           # Check process status
pm2 logs             # View logs
pm2 monit           # Real-time monitoring
pm2 restart all     # Restart all processes
```

### Health Checks

```bash
# API health check
curl http://localhost:3001/api/health

# Frontend health check
curl http://localhost:3000/api/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use Prettier for code formatting
- Write unit tests for new features
- Update documentation for API changes
- Follow conventional commit messages

## 📝 API Documentation

### Authentication Endpoints

```
POST /api/auth/register  # User registration
POST /api/auth/login     # User login
POST /api/auth/refresh   # Token refresh
GET  /api/auth/me        # Get current user
```

### Conversion Endpoints

```
POST /api/convert/svg-to-png    # Convert SVG to PNG
POST /api/convert/png-to-svg    # Convert PNG to SVG
POST /api/convert/svg-to-jpg    # Convert SVG to JPG
GET  /api/convert/status/:id    # Check conversion status
GET  /api/convert/download/:id  # Download converted file
```

### Admin Endpoints

```
GET  /api/admin/dashboard       # Dashboard statistics
GET  /api/admin/users          # User management
PUT  /api/admin/users/:id      # Update user limits
GET  /api/admin/conversions    # Conversion history
```

## 🐛 Troubleshooting

### Common Issues

**MySQL Connection Error**

```bash
# Check MySQL service
sudo systemctl status mysql
sudo systemctl start mysql
```

**Redis Connection Error**

```bash
# Check Redis service
sudo systemctl status redis
sudo systemctl start redis
```

**File Processing Errors**

```bash
# Install missing dependencies
sudo apt install ghostscript potrace imagemagick
```

**PM2 Process Issues**

```bash
# Check process logs
pm2 logs
pm2 restart ecosystem.config.js
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [BullMQ](https://bullmq.io/) - Job queue
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing

---

**📧 Contact**: [ducchungtx@gmail.com](mailto:ducchungtx@gmail.com)

---

Built with ❤️ using Next.js 15, React 19, and modern web technologies.
