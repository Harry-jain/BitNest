#!/bin/bash

# BitNest Setup Script
echo "🌟 Welcome to BitNest Setup 🌟"
echo "------------------------------"

# Create storage directory
echo "📁 Setting up storage directory..."
mkdir -p "/storage/emulated/0/BitNestMedia"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "📄 Creating .env.local file..."
  cp env.template .env.local
  
  # Generate random NEXTAUTH_SECRET
  RANDOM_SECRET=$(openssl rand -base64 32)
  sed -i "s/random-secure-secret-replace-this/$RANDOM_SECRET/g" .env.local
  
  echo "⚙️ Please edit .env.local with your Supabase credentials"
else
  echo "✅ .env.local already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "
✅ BitNest setup completed!
------------------------------
To start BitNest:
  npm run dev

Access BitNest at:
  http://localhost:3000
" 