const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Mykim2204', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'zrmedia9@gmail.com' },
    update: {},
    create: {
      email: 'zrmedia9@gmail.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      dailyLimit: 9999,
      isActive: true,
    },
  });

  console.log('👤 Created admin user:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@convert.com' },
    update: {},
    create: {
      email: 'user@convert.com',
      password: userPassword,
      name: 'Test User',
      role: 'USER',
      dailyLimit: 50,
      isActive: true,
    },
  });

  console.log('👤 Created test user:', user.email);

  // Create premium user
  const premiumPassword = await bcrypt.hash('premium123', 12);
  const premium = await prisma.user.upsert({
    where: { email: 'premium@convert.com' },
    update: {},
    create: {
      email: 'premium@convert.com',
      password: premiumPassword,
      name: 'Premium User',
      role: 'PREMIUM',
      dailyLimit: 500,
      isActive: true,
    },
  });

  console.log('👤 Created premium user:', premium.email);

  // Create default settings
  const defaultSettings = [
    {
      key: 'max_file_size',
      value: '52428800', // 50MB
      description: 'Maximum file size in bytes',
      category: 'upload',
      isPublic: true,
    },
    {
      key: 'allowed_formats',
      value: 'svg,png,jpg,jpeg,pdf,eps',
      description: 'Allowed file formats for conversion',
      category: 'conversion',
      isPublic: true,
    },
    {
      key: 'cleanup_interval',
      value: '3600000', // 1 hour
      description: 'File cleanup interval in milliseconds',
      category: 'system',
      isPublic: false,
    },
    {
      key: 'rate_limit_guest',
      value: '5',
      description: 'Rate limit for guest users per hour',
      category: 'rate_limit',
      isPublic: true,
    },
    {
      key: 'rate_limit_user',
      value: '50',
      description: 'Rate limit for registered users per day',
      category: 'rate_limit',
      isPublic: true,
    },
    {
      key: 'rate_limit_premium',
      value: '500',
      description: 'Rate limit for premium users per day',
      category: 'rate_limit',
      isPublic: true,
    },
    {
      key: 'file_retention_hours',
      value: '24',
      description: 'How long to keep converted files (hours)',
      category: 'storage',
      isPublic: true,
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Enable maintenance mode',
      category: 'system',
      isPublic: true,
    },
    {
      key: 'registration_enabled',
      value: 'true',
      description: 'Allow new user registrations',
      category: 'auth',
      isPublic: true,
    },
    {
      key: 'conversion_quality_default',
      value: '80',
      description: 'Default conversion quality (1-100)',
      category: 'conversion',
      isPublic: true,
    }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('⚙️ Created default settings');

  // Create sample conversions for demo
  const sampleConversions = [
    {
      userId: user.id,
      fromFormat: 'svg',
      toFormat: 'png',
      originalFilename: 'logo.svg',
      convertedFilename: 'logo.png',
      fileSize: 1024,
      outputFileSize: 2048,
      status: 'COMPLETED',
      processingTime: 500,
      downloadCount: 2,
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
    {
      userId: user.id,
      fromFormat: 'png',
      toFormat: 'svg',
      originalFilename: 'image.png',
      convertedFilename: 'image.svg',
      fileSize: 4096,
      outputFileSize: 1536,
      status: 'COMPLETED',
      processingTime: 1200,
      downloadCount: 1,
      completedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours
    },
    {
      userId: premium.id,
      fromFormat: 'pdf',
      toFormat: 'svg',
      originalFilename: 'document.pdf',
      status: 'FAILED',
      errorMessage: 'PDF file is corrupted or password protected',
      fileSize: 8192,
      processingTime: 300,
    }
  ];

  for (const conversion of sampleConversions) {
    await prisma.conversion.create({
      data: conversion,
    });
  }

  console.log('🔄 Created sample conversions');

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: zrmedia9@gmail.com / Mykim2204');
  console.log('User: user@convert.com / user123');
  console.log('Premium: premium@convert.com / premium123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
