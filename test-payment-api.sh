#!/bin/bash

# Payment API Test Script
# This script tests the payment API endpoints

BASE_URL="http://localhost:3004"
TOKEN="YOUR_AUTH_TOKEN_HERE"

echo "==================================="
echo "Payment API Test Script"
echo "==================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get all payments
echo -e "${YELLOW}Test 1: Get all payments${NC}"
echo "GET $BASE_URL/api/payments"
curl -s -X GET "$BASE_URL/api/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Response received"
echo -e "\n"

# Test 2: Get payment analytics
echo -e "${YELLOW}Test 2: Get payment analytics${NC}"
echo "GET $BASE_URL/api/payments/analytics"
curl -s -X GET "$BASE_URL/api/payments/analytics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Response received"
echo -e "\n"

# Test 3: Get payments with filters (successful payments)
echo -e "${YELLOW}Test 3: Get successful payments${NC}"
echo "GET $BASE_URL/api/payments?status=successful"
curl -s -X GET "$BASE_URL/api/payments?status=successful" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Response received"
echo -e "\n"

# Test 4: Get payment by ID (replace with actual ID)
PAYMENT_ID=1
echo -e "${YELLOW}Test 4: Get payment by ID${NC}"
echo "GET $BASE_URL/api/payments/$PAYMENT_ID"
curl -s -X GET "$BASE_URL/api/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Response received"
echo -e "\n"

# Test 5: Create a test payment
echo -e "${YELLOW}Test 5: Create payment (public endpoint)${NC}"
echo "POST $BASE_URL/api/payments"
curl -s -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "transaction_id": "TEST_'$(date +%s)'",
    "amount": 1000,
    "payment_method": "Test",
    "payment_status": "pending"
  }' | jq '.' 2>/dev/null || echo "Response received"
echo -e "\n"

echo -e "${GREEN}==================================="
echo "Tests completed!"
echo "===================================${NC}"
echo ""
echo "Note: Replace YOUR_AUTH_TOKEN_HERE with actual token"
echo "You can get the token by logging in to the admin panel"
