#!/bin/bash

# BitNest SSL Certificate Setup Script
# This script sets up SSL certificates for global access via IP address

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}      BitNest SSL Certificate Setup      ${NC}"
echo -e "${BLUE}=========================================${NC}"

IP_ADDR=$1
SSL_DIR=~/bitnest/ssl
NGINX_CONF=~/bitnest/nginx.conf

# Check if an IP address was provided
if [ -z "$IP_ADDR" ]; then
  echo -e "${RED}Error: Please provide your IP address.${NC}"
  echo -e "Usage: ./ssl-setup.sh your-ip-address"
  echo -e "Example: ./ssl-setup.sh 192.168.1.100"
  exit 1
fi

# Create SSL directory
mkdir -p $SSL_DIR

echo -e "\n${GREEN}Generating self-signed certificate for IP address: $IP_ADDR${NC}"

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout $SSL_DIR/key.pem -out $SSL_DIR/cert.pem -days 365 -nodes -subj "/CN=$IP_ADDR" -addext "subjectAltName=IP:$IP_ADDR"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to generate self-signed certificate.${NC}"
  exit 1
fi

echo -e "${GREEN}Self-signed certificate generated successfully!${NC}"

# Create NGINX configuration for proxying
echo -e "\n${GREEN}Creating NGINX configuration...${NC}"
cat > $NGINX_CONF << EOL
worker_processes 1;
events {
    worker_connections 1024;
}

http {
    upstream nextjs_upstream {
        server 127.0.0.1:3000;
    }

    # HTTPS server for IP access
    server {
        listen 443 ssl;
        server_name $IP_ADDR;

        ssl_certificate $SSL_DIR/cert.pem;
        ssl_certificate_key $SSL_DIR/key.pem;
        
        # Enhanced SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-XSS-Protection "1; mode=block";
        
        # Increase header buffer size for JWT tokens
        large_client_header_buffers 4 32k;

        location / {
            proxy_pass http://nextjs_upstream;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_cache_bypass \$http_upgrade;
        }
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name $IP_ADDR;
        return 301 https://\$host\$request_uri;
    }
}
EOL

# Install NGINX if not already installed
if ! command -v nginx &> /dev/null; then
    echo -e "\n${GREEN}Installing NGINX...${NC}"
    pkg install -y nginx
fi

# Create a startup script for NGINX
echo -e "\n${GREEN}Creating NGINX startup script...${NC}"
cat > ~/bitnest/start-nginx.sh << EOL
#!/bin/bash

# Kill any existing NGINX process
pkill nginx 2>/dev/null

# Start NGINX with our configuration
nginx -c $NGINX_CONF

echo "NGINX started with SSL. BitNest is now accessible via HTTPS."
EOL

chmod +x ~/bitnest/start-nginx.sh

# Configure port forwarding instructions
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}SSL Setup Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "\n${BLUE}Your BitNest instance can now be accessed securely at:${NC}"
echo -e "  https://$IP_ADDR"

echo -e "\n${BLUE}To start the NGINX proxy with SSL, run:${NC}"
echo -e "  ~/bitnest/start-nginx.sh"

echo -e "\n${BLUE}IMPORTANT: For remote access, set up port forwarding on your router:${NC}"
echo -e "  1. Forward port 80 to your device for HTTP redirects"
echo -e "  2. Forward port 443 to your device for HTTPS access"
echo -e ""

echo -e "${BLUE}NOTE: Since we're using a self-signed certificate for an IP address:${NC}"
echo -e "  - Browsers will show a security warning the first time you connect"
echo -e "  - This is normal for self-signed certificates"
echo -e "  - You'll need to click 'Advanced' and 'Proceed to site' (or similar)"
echo -e "  - For personal use, this is secure enough and doesn't require payment for a certificate"
echo -e "" 