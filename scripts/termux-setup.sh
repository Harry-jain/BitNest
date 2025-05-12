#!/bin/bash

# BitNest Setup Script for Termux
# This script sets up BitNest on Android via Termux

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}      BitNest Setup for Termux          ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Request storage permissions
echo -e "\n${GREEN}Requesting storage access...${NC}"
termux-setup-storage

# Check for external storage
echo -e "\n${GREEN}Checking for external storage...${NC}"
if [ -d "/storage/external-1" ]; then
    MEDIA_ROOT="/storage/external-1/BitNestMedia"
    echo -e "${GREEN}External storage found! Using ${MEDIA_ROOT}${NC}"
else
    MEDIA_ROOT="/storage/emulated/0/BitNestMedia"
    echo -e "${BLUE}No external storage found. Using internal storage: ${MEDIA_ROOT}${NC}"
fi

# Create directories
echo -e "\n${GREEN}Creating media directories...${NC}"
mkdir -p $MEDIA_ROOT
mkdir -p $MEDIA_ROOT/chunks
mkdir -p $MEDIA_ROOT/files
mkdir -p $MEDIA_ROOT/streaming
mkdir -p $MEDIA_ROOT/thumbnails

# Install dependencies
echo -e "\n${GREEN}Installing dependencies...${NC}"
apt update -y
apt upgrade -y
apt install -y nodejs git ffmpeg curl wget cronie

# Install pm2 for process management
echo -e "\n${GREEN}Installing PM2 process manager...${NC}"
npm install -g pm2

# Check if inside the BitNest directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in BitNest directory.${NC}"
    echo -e "${BLUE}Please run this script from the BitNest directory.${NC}"
    exit 1
fi

# Create environment file
echo -e "\n${GREEN}Creating environment file...${NC}"
cp env.template .env.local

# Prompt user for MongoDB URL
echo -e "\n${BLUE}Please enter your MongoDB URI:${NC}"
read -p "> " MONGODB_URI

# Update .env file with MongoDB URI
sed -i "s|MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|g" .env.local

# Add media root to .env
sed -i "s|MEDIA_ROOT=.*|MEDIA_ROOT=$MEDIA_ROOT|g" .env.local

# Generate a random secret for NextAuth
NEXTAUTH_SECRET=$(openssl rand -base64 32)
sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|g" .env.local

# Install npm packages
echo -e "\n${GREEN}Installing Node dependencies...${NC}"
npm install

# Build the application
echo -e "\n${GREEN}Building the application...${NC}"
npm run build

# Create startup script
echo -e "\n${GREEN}Creating startup script...${NC}"
cat > ~/bitnest-start.sh << 'EOL'
#!/bin/bash

cd ~/bitnest
pm2 start npm --name bitnest -- start
echo "BitNest started with PM2. To view logs, run: pm2 logs bitnest"
EOL

chmod +x ~/bitnest-start.sh

# Set up the automatic update schedule
echo -e "\n${GREEN}Setting up automatic weekly updates...${NC}"
chmod +x scripts/update.sh
./scripts/update.sh --setup

# Setup complete
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}BitNest setup complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "\n${BLUE}To start BitNest:${NC}"
echo -e "  ~/bitnest-start.sh"
echo -e "\n${BLUE}Your media will be stored in:${NC}"
echo -e "  $MEDIA_ROOT"
echo -e "\n${BLUE}BitNest will automatically update every Sunday at 5:00 AM${NC}"
echo -e "\n${BLUE}To manually trigger an update:${NC}"
echo -e "  ~/bitnest/scripts/update.sh"
echo -e "\n${BLUE}Thank you for installing BitNest!${NC}" 