#!/bin/bash

# BitNest SSL Certificate Setup Script
# This script sets up SSL certificates for global access

DOMAIN=$1
SSL_DIR=~/bitnest/ssl
NGINX_CONF=~/bitnest/nginx.conf

echo "=== BitNest SSL Certificate Setup ==="

# Check if a domain was provided
if [ -z "$DOMAIN" ]; then
  echo "Error: Please provide a domain name or IP address."
  echo "Usage: ./ssl-setup.sh your-domain-or-ip"
  exit 1
fi

# Create SSL directory
mkdir -p $SSL_DIR

# Check if using domain or IP
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "IP address detected: $DOMAIN"
  echo "Generating self-signed certificate..."
  
  # Generate self-signed certificate
  openssl req -x509 -newkey rsa:4096 -keyout $SSL_DIR/key.pem -out $SSL_DIR/cert.pem -days 365 -nodes -subj "/CN=$DOMAIN"
  
  if [ $? -ne 0 ]; then
    echo "Failed to generate self-signed certificate."
    exit 1
  fi
  
  echo "Self-signed certificate generated successfully!"
else
  echo "Domain name detected: $DOMAIN"
  echo "Attempting to get Let's Encrypt certificate..."
  
  # Check if certbot is installed
  if ! command -v certbot &> /dev/null; then
    echo "Certbot not found. Installing..."
    pkg install -y python3 python3-pip
    pip install certbot
  fi
  
  # Get Let's Encrypt certificate
  certbot certonly --standalone --preferred-challenges http -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
  
  if [ $? -ne 0 ]; then
    echo "Failed to obtain Let's Encrypt certificate."
    echo "Falling back to self-signed certificate..."
    openssl req -x509 -newkey rsa:4096 -keyout $SSL_DIR/key.pem -out $SSL_DIR/cert.pem -days 365 -nodes -subj "/CN=$DOMAIN"
  else
    # Copy Let's Encrypt certificates
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/key.pem
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/cert.pem
  fi
fi

# Create NGINX configuration for proxying
cat > $NGINX_CONF << EOL
worker_processes 1;
events {
    worker_connections 1024;
}

http {
    upstream nextjs_upstream {
        server 127.0.0.1:3000;
    }

    server {
        listen 443 ssl;
        server_name $DOMAIN;

        ssl_certificate $SSL_DIR/cert.pem;
        ssl_certificate_key $SSL_DIR/key.pem;

        location / {
            proxy_pass http://nextjs_upstream;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name $DOMAIN;
        return 301 https://\$host\$request_uri;
    }
}
EOL

# Install NGINX if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing NGINX..."
    pkg install -y nginx
fi

# Create a startup script for NGINX
cat > ~/bitnest/start-nginx.sh << EOL
#!/bin/bash
nginx -c $NGINX_CONF
EOL

chmod +x ~/bitnest/start-nginx.sh

echo ""
echo "=== SSL Setup Complete! ==="
echo ""
echo "Your BitNest instance can now be accessed securely at:"
echo "  https://$DOMAIN"
echo ""
echo "To start the NGINX proxy with SSL, run:"
echo "  ~/bitnest/start-nginx.sh"
echo ""
echo "NOTE: For port forwarding to work, ensure your router is configured to:"
echo "  - Forward port 80 to your device for HTTP"
echo "  - Forward port 443 to your device for HTTPS"
echo "" 