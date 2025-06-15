#!/bin/bash

echo "🚀 Testing Limit Configuration System"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001"

echo -e "\n${YELLOW}1. Testing Guest Limits API${NC}"
echo "curl -X GET $API_URL/api/guest/limits"
curl -X GET "$API_URL/api/guest/limits" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo -e "\n${YELLOW}2. Testing Admin Limit Configs API (requires auth)${NC}"
echo "Note: This will fail without authentication token"
echo "curl -X GET $API_URL/api/admin/limit-configs"
curl -X GET "$API_URL/api/admin/limit-configs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo -e "\n${YELLOW}3. Testing Conversion with Guest Limits${NC}"
echo "This will test file conversion with guest headers"
echo "curl -X POST $API_URL/api/conversion/convert (with guest headers)"

# Create a test SVG file
cat > test.svg << 'EOF'
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>
EOF

curl -X POST "$API_URL/api/conversion/convert" \
  -H "x-guest-conversion: true" \
  -F "file=@test.svg" \
  -F "targetFormat=png" \
  -w "\nStatus: %{http_code}\n" \
  -s

# Clean up
rm -f test.svg

echo -e "\n${GREEN}✅ Test completed!${NC}"
echo -e "${YELLOW}Note: Admin APIs require authentication${NC}"
echo -e "${YELLOW}Note: Database migration may be required for full functionality${NC}"

echo -e "\n${YELLOW}To run the database migration manually:${NC}"
echo "cd backend && mysql -u convert_user -p convert_db < database/migrations/add_limit_configuration_table.sql"

echo -e "\n${YELLOW}To initialize default configurations:${NC}"
echo "cd backend && node scripts/init-limit-configs.js"
