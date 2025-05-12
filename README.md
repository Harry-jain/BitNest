# <div align="center">BitNest</div>

<div align="center">
  <img src="public/logo.svg" alt="BitNest Logo" width="200" height="200"/>
  <p><i>A self-hosted, lightweight streaming and file storage platform for Android devices</i></p>
</div>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#requirements">Requirements</a> •
  <a href="#installation">Installation</a> •
  <a href="#global-access">Global Access</a> •
  <a href="#updating">Updating</a> •
  <a href="#troubleshooting">Troubleshooting</a>
</p>

## Features

- **Adaptive Streaming**: Netflix-style HLS streaming with adaptive bitrate selection
- **Efficient Storage**: Content-defined chunking with deduplication and compression
- **Mobile Friendly**: Designed to run efficiently on Android with Termux
- **External Storage**: Support for external HDD via USB OTG
- **Auto Updates**: Weekly GitHub synchronization with rollback capability
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Global Access**: Access your media from anywhere using port forwarding & SSL

## Requirements

- Android device (tested on OnePlus 8) with Termux installed
- (Optional) External HDD connected via USB-C OTG adapter
- Internet connection for MongoDB Atlas
- MongoDB Atlas free tier account
- Firebase account for authentication

## Installation

### 1. Install Termux

Download Termux from [F-Droid](https://f-droid.org/packages/com.termux/) (preferred) or GitHub.

### 2. Install Requirements in Termux

```bash
# Update packages
pkg update -y
pkg upgrade -y

# Install required packages
pkg install -y nodejs git ffmpeg wget python
```

### 3. Clone the Repository

```bash
# Create directory for BitNest
mkdir -p ~/bitnest
cd ~/bitnest

# Clone the repository
git clone https://github.com/Harry-jain/BitNest.git .
```

### 4. Run the Setup Script

```bash
# Make the setup script executable
chmod +x scripts/termux-setup.sh

# Run the setup script
./scripts/termux-setup.sh
```

The setup script will:
- Configure access to external storage
- Create necessary directories
- Set up environment variables
- Build the application
- Configure automatic updates

### 5. Configure Environment Variables

Edit the `.env.local` file:

```bash
nano .env.local
```

Add your MongoDB and Firebase credentials.

### 6. Start BitNest

```bash
# Start with PM2 for persistence
./bitnest-start.sh
```

## Global Access

To access BitNest from anywhere in the world:

### 1. Set up Port Forwarding

1. Access your router's admin panel (typically http://192.168.1.1)
2. Navigate to port forwarding settings
3. Create a new rule to forward external port 443 (HTTPS) to internal port 3000
4. Save settings

### 2. Get a Domain (Optional)

You can access BitNest directly via your IP address, but for convenience you can:
1. Use a free dynamic DNS service (like No-IP, DuckDNS, or FreeDNS)
2. Register the domain and point it to your IP

### 3. Generate SSL Certificate

BitNest includes a script to generate a free SSL certificate using Let's Encrypt:

```bash
# Install certbot
pkg install -y python3 python3-pip
pip install certbot

# Get certificate (replace with your domain or IP)
cd ~/bitnest
./scripts/ssl-setup.sh your-domain-or-ip
```

If using an IP address directly, you'll need a self-signed certificate:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## Updating

BitNest uses a multi-branch strategy to ensure stability:

- **dev**: Daily development work (unstable)
- **test**: Feature testing, merged from dev
- **main**: Stable release, only merged after thorough testing
- **backup**: One version behind main, used for recovery

The app is configured to check for updates weekly, and follows this process:
1. Creates a backup of current state
2. Attempts to pull from main branch
3. Rebuilds and checks for problems
4. Rolls back to backup branch if problems occur

You can manually update with:

```bash
~/bitnest/scripts/update.sh
```

## Troubleshooting

### Application Won't Start

Check the logs:

```bash
pm2 logs bitnest
```

### Reset Application State

```bash
pm2 stop bitnest
pm2 start bitnest
```

### Restore from Backup

If you need to restore from a backup:

```bash
# List available backups
ls -l ~/bitnest_backups/

# Stop current instance
pm2 stop bitnest

# Restore backup
cp -r ~/bitnest_backups/bitnest_TIMESTAMP ~/bitnest

# Restart application
cd ~/bitnest
pm2 start bitnest
```

## License

[MIT License](LICENSE)

## Acknowledgments

- Next.js
- Tailwind CSS
- MongoDB
- Firebase
- FFmpeg

---

<div align="center">
  <p>Built with ❤️ for Android users who want their own personal media cloud.</p>
</div> 