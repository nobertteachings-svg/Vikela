#!/bin/bash

# Railway Setup Helper Script
# This script helps generate required values for Railway deployment

API_URL="https://api-production-eec4.up.railway.app"
WEB_URL="https://REPLACE-WITH-WEB-DOMAIN.up.railway.app"

echo "🚀 Railway Setup Helper for Vikela"
echo "====================================="
echo ""

# Generate encryption key
echo "📝 Generating ENCRYPTION_KEY..."
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

# Show Railway service structure
echo "📦 Required Railway Services:"
echo "  1. PostgreSQL (with pgvector extension)"
echo "  2. Redis"
echo "  3. Web App (apps/web)"
echo "  4. API (apps/api)"
echo ""

# Show required environment variables
echo "🔑 Required Environment Variables for API:"
echo "  - NODE_ENV=production"
echo "  - DATABASE_URL={{RAILWAY_POSTGRES_DATABASE_URL}}"
echo "  - DIRECT_URL={{RAILWAY_POSTGRES_DATABASE_URL}}"
echo "  - REDIS_URL={{RAILWAY_REDIS_REDIS_URL}}"
echo "  - ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "  - APP_URL=$WEB_URL"
echo "  - API_URL=$API_URL"
echo "  - CORS_ALLOWED_ORIGINS=$WEB_URL"
echo "  - CLERK_PUBLISHABLE_KEY=pk_test_..."
echo "  - CLERK_SECRET_KEY=sk_test_..."
echo "  - CLERK_WEBHOOK_SECRET=whsec_..."
echo "  - Clerk webhook: $API_URL/api/v1/webhooks/clerk"
echo ""
echo "  - NODE_ENV=production"
echo "  - NEXT_PUBLIC_API_URL=$API_URL"
echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."
echo ""

echo "📋 Next Steps:"
echo "  1. Create a Railway project"
echo "  2. Add PostgreSQL and Redis services"
echo "  3. Deploy API and Web services"
echo "  4. Configure environment variables (see RAILWAY_DEPLOYMENT.md)"
echo "  5. Run database migrations: npx prisma migrate deploy"
echo "  6. (Optional) Seed database: npx tsx apps/api/src/db/seed.ts"
echo ""

echo "✅ Setup complete! See RAILWAY_DEPLOYMENT.md for detailed instructions."
