#!/bin/bash

# BitNest: Termux Setup Script
# This script sets up BitNest on Termux for Android

echo "=== BitNest Termux Setup ==="
echo "Setting up BitNest on your mobile device..."

# Update package repositories
echo "Updating package repositories..."
pkg update -y

# Install required packages
echo "Installing required packages..."
pkg install -y nodejs ffmpeg git wget python

# Create directory structure
echo "Creating directory structure..."
mkdir -p ~/bitnest
cd ~/bitnest

# Clone BitNest repository if not already present
if [ ! -d ".git" ]; then
  echo "Cloning BitNest repository..."
  git clone https://github.com/yourusername/bitnest.git .
else
  echo "BitNest repository already exists, updating..."
  git pull
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Setup external storage access
echo "Setting up external storage access..."
termux-setup-storage

# Create media directory on external storage if available
if [ -d ~/storage/external-1 ]; then
  echo "External storage detected. Setting up media directory..."
  mkdir -p ~/storage/external-1/BitNestMedia
  echo "Media directory created at ~/storage/external-1/BitNestMedia"
else
  echo "No external storage detected. Using internal storage..."
  mkdir -p ~/storage/shared/BitNestMedia
  echo "Media directory created at ~/storage/shared/BitNestMedia"
fi

# Create .env file
echo "Creating environment configuration..."
cat > .env.local << EOL
# BitNest Environment Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/bitnest?retryWrites=true&w=majority

# Update these with your Firebase credentials
FIREBASE_API_KEY=""
FIREBASE_AUTH_DOMAIN=""
FIREBASE_PROJECT_ID=""
FIREBASE_STORAGE_BUCKET=""
FIREBASE_MESSAGING_SENDER_ID=""
FIREBASE_APP_ID=""

# Storage path (change if needed)
MEDIA_ROOT="~/storage/external-1/BitNestMedia"

# Next Auth
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# API endpoints
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
EOL

echo "⚠️ IMPORTANT: Edit .env.local with your MongoDB and Firebase credentials"

# Build the application
echo "Building the application..."
npm run build

# Setup PM2 for process management
echo "Setting up PM2 for process management..."
npm install -g pm2

# Create update script
echo "Creating update script..."
cat > ~/bitnest/scripts/update.sh << EOL
#!/bin/bash

# BitNest Update Script
cd ~/bitnest

# Backup current version
echo "Creating backup..."
timestamp=\$(date +"%Y%m%d_%H%M%S")
mkdir -p ~/bitnest_backups
cp -r ~/bitnest ~/bitnest_backups/bitnest_\$timestamp

# Get current commit hash
current=\$(git rev-parse HEAD)
git fetch origin main

# Get remote commit hash
remote=\$(git rev-parse origin/main)

if [ "\$current" == "\$remote" ]; then
  echo "Already up to date. Skipping update."
  exit 0
fi

echo "Updating from \$current to \$remote..."

# Pull changes
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build

# Restart the application
pm2 restart bitnest

# Health check
echo "Performing health check..."
sleep 300 # Wait 5 minutes for app to start

# Try to access the application
response=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ \$response -eq 200 ]; then
  echo "Update successful!"
else
  echo "Update failed! Rolling back..."
  # Stop the current version
  pm2 stop bitnest
  
  # Restore the backup
  rm -rf ~/bitnest
  cp -r ~/bitnest_backups/bitnest_\$timestamp ~/bitnest
  
  # Restart from backup
  cd ~/bitnest
  pm2 restart bitnest
  
  echo "Rollback complete."
fi
EOL

chmod +x ~/bitnest/scripts/update.sh

# Setup cron job for weekly updates
echo "Setting up weekly updates..."
(crontab -l 2>/dev/null; echo "0 5 * * 0 ~/bitnest/scripts/update.sh >> ~/bitnest_logs/update_\$(date +\%Y\%m\%d).log 2>&1") | crontab -

# Create startup script
echo "Creating startup script..."
cat > ~/bitnest-start.sh << EOL
#!/bin/bash
cd ~/bitnest
pm2 start npm --name "bitnest" -- start
EOL

chmod +x ~/bitnest-start.sh

echo ""
echo "=== BitNest Setup Complete! ==="
echo ""
echo "To start BitNest, run:"
echo "  ~/bitnest-start.sh"
echo ""
echo "BitNest will be available at:"
echo "  http://localhost:3000"
echo ""
echo "IMPORTANT: Don't forget to edit .env.local with your database credentials!"
echo "To access BitNest from other devices on your network, find your IP address with 'ifconfig' or 'ip addr show'"
echo "" 