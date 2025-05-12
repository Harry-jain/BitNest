# BitNest

<p align="center">
  <img src="./public/logo.svg" alt="BitNest Logo" width="150" height="150" />
</p>

<p align="center">
  <b>Your Personal Self-Hosted Cloud Storage & Media Streaming Platform</b>
</p>

BitNest is a lightweight, self-hosted cloud storage and media streaming solution designed to run on Android devices, leveraging your phone's storage to create your own personal cloud.

## What's New in BitNest

- **Supabase Integration**: Switched to Supabase for authentication and database, removing MongoDB and Firebase dependencies
- **Social Authentication**: Added Google and GitHub login options alongside email/password
- **Admin Dashboard**: Full control panel for managing users, storage quotas, and system settings
- **User Containerization**: Each user's files are isolated in separate directories for enhanced security
- **Automated Setup**: Interactive one-command setup scripts for both Windows and Android/Linux
- **HTTPS Support**: Optional secure connections with SSL certificate configuration
- **Resource Management**: Optimized for low memory usage (under 1GB) even on mobile devices
- **Storage Monitoring**: Built-in disk space monitoring with admin notifications
- **Enhanced Security**: Path verification to ensure users can only access their own files

## Key Features

- **Self-Hosted**: Run BitNest directly on your Android device
- **Lightweight**: Minimal dependencies, optimized for phones
- **User Isolation**: Containerized storage keeps each user's files separate and secure
- **Multiple Authentication Methods**: Email/password, Google, and GitHub login options
- **Admin Dashboard**: Control user limits and storage quotas
- **Media Streaming**: Stream videos with adaptive quality based on your network
- **Easy Setup**: One-command setup that optimizes your device's memory

## Interactive Setup

BitNest now features an interactive setup process that guides you through the configuration:

### For Android/Linux:

```bash
# Clone the repository
git clone https://github.com/yourusername/bitnest.git
cd bitnest

# Run the interactive setup
./scripts/autosetup.sh
```

### For Windows:

```bash
# Clone the repository
git clone https://github.com/yourusername/bitnest.git
cd bitnest

# Run the interactive setup
scripts\autosetup.bat
```

The setup script will:

1. Free up memory by stopping unnecessary processes
2. Create the required storage directories
3. Ask for your Supabase credentials
4. Guide you through configuration options:
   - Maximum number of users
   - Default storage quota
   - HTTPS setup
5. Help set up your admin account
6. Install dependencies
7. Build for production
8. Start BitNest efficiently

## Manual Setup (Alternative)

If you prefer manual setup, follow the steps in [SETUP.md](SETUP.md).

## Running BitNest

After setup, start BitNest with:

### For Android/Linux:
```bash
# Production mode (recommended for daily use)
./scripts/start.sh prod

# Development mode
./scripts/start.sh
```

### For Windows:
```bash
# Production mode (recommended for daily use)
scripts\start.bat prod

# Development mode
scripts\start.bat
```

## Admin Dashboard

BitNest includes a powerful admin dashboard for managing your self-hosted cloud:

1. Log in as an admin user (created during setup)
2. Navigate to `/admin` in your browser
3. From the dashboard, you can:
   - Monitor system stats and storage usage
   - Set maximum number of users allowed
   - Define default storage quota for new users
   - Set total storage limit
   - Modify individual user quotas
   - View active users and system performance

## User Management

- **User Registration**: New users can register with email/password or social login
- **Storage Quotas**: Each user has their own storage quota (configurable by admin)
- **Containerization**: Users can only access their own files
- **File Management**: Upload, download, stream, and share files

## Performance Optimization

- **Minimize Termux Sessions**: Keep only 1-2 active sessions to reduce resource usage
- **Use Production Mode**: For daily use, run with `start.sh prod` which uses less resources
- **Scheduled Maintenance**: Automated tasks keep the system running smoothly
- **Memory Management**: Closes unnecessary background processes during startup
- **Session Management**: Use `tmux` to run BitNest in the background (included in setup)

## System Requirements

- Android device with Termux (or any device with Node.js)
- 1GB+ RAM (optimized to run at <1GB)
- Storage space for your files
- Node.js 14+
- Free Supabase account

## Security Features

- **User Isolation**: Each user's files are stored in separate containers
- **Path Verification**: Ensures users can only access their own files
- **Supabase Authentication**: Secure authentication with multiple providers
- **Quota Management**: Prevent individual users from using excessive storage
- **Optional HTTPS**: Secure connections with SSL certificates

## Troubleshooting

- **Storage Permission Issues**: Run `termux-setup-storage` in Termux
- **App Won't Start**: Check that your .env.local file has the correct values
- **Can't Sign Up**: Ensure Supabase authentication is enabled (Email provider)
- **Performance Issues**: Reduce the number of active Termux sessions and close background apps
- **Can't Upload Files**: Ensure the storage directory exists and has correct permissions

For detailed setup instructions, see [SETUP.md](SETUP.md). 