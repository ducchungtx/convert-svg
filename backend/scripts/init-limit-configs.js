const { PrismaClient } = require('@prisma/client');
const limitConfigService = require('../src/services/limitConfigService');
const logger = require('../src/utils/logger');

const prisma = new PrismaClient();

async function initializeLimitConfigs() {
  try {
    console.log('🚀 Initializing limit configurations...');

    // Initialize default configurations
    await limitConfigService.initializeDefaultConfigs();

    console.log('✅ Limit configurations initialized successfully!');

    // Display current configurations
    const configs = await limitConfigService.getAllLimitConfigs();
    console.log('\n📋 Current configurations:');
    configs.forEach(config => {
      console.log(`- ${config.userType} / ${config.subscriptionType}:`);
      console.log(`  Max files: ${config.maxFilesPerConversion}`);
      console.log(`  Max file size: ${Math.round(config.maxFileSize / 1024 / 1024)}MB`);
      console.log(`  Daily limit: ${config.maxDailyConversions}`);
      console.log(`  Monthly limit: ${config.maxMonthlyConversions || 'Unlimited'}`);
      console.log(`  Formats: ${config.allowedFormats.join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to initialize limit configurations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  initializeLimitConfigs();
}

module.exports = { initializeLimitConfigs };
