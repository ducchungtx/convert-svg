// Test script for subscription system
const { PrismaClient } = require('@prisma/client');
const { checkAndUpdateUsage, getSubscriptionFeatures, canAccessFeature } = require('./src/utils/subscriptionHelper');

const prisma = new PrismaClient();

async function testSubscriptionSystem() {
  try {
    console.log('🧪 Testing Subscription System...\n');

    // Test 1: Check subscription features
    console.log('1. Testing subscription features:');
    const freeFeatures = getSubscriptionFeatures('FREE');
    const premiumFeatures = getSubscriptionFeatures('PREMIUM');

    console.log('FREE tier features:', freeFeatures);
    console.log('PREMIUM tier features:', premiumFeatures);
    console.log('');

    // Test 2: Check feature access
    console.log('2. Testing feature access:');
    console.log('FREE tier can convert:', canAccessFeature('FREE', 'conversion'));
    console.log('FREE tier can batch convert:', canAccessFeature('FREE', 'batchConversion'));
    console.log('PREMIUM tier can batch convert:', canAccessFeature('PREMIUM', 'batchConversion'));
    console.log('');

    // Test 3: Create a test user (if not exists)
    let testUser = await prisma.user.findFirst({
      where: { email: 'test-subscription@example.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test-subscription@example.com',
          name: 'Test User',
          password: 'hashedpassword123',
          subscriptionType: 'FREE',
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          monthlyLimit: 10,
          usedThisMonth: 0
        }
      });
      console.log('✅ Created test user:', testUser.email);
    } else {
      console.log('✅ Found existing test user:', testUser.email);
    }

    // Test 4: Check usage
    console.log('\n3. Testing usage check:');
    const usageResult = await checkAndUpdateUsage(testUser.id, 'conversion', 1);
    console.log('Usage check result:', usageResult);

    // Test 5: Get updated user info
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: {
        id: true,
        email: true,
        subscriptionType: true,
        subscriptionStatus: true,
        monthlyLimit: true,
        usedThisMonth: true,
        subscriptionEnd: true
      }
    });
    console.log('\n4. Updated user subscription info:', updatedUser);

    console.log('\n✅ Subscription system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscriptionSystem();
