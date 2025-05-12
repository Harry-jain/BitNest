#!/bin/bash

# BitNest Auto Setup Script - One command to rule them all
echo "🚀 BitNest Auto Setup - The simplest way to set up your personal cloud"
echo "=================================================================="

# Function to display memory usage
check_memory() {
    if [ -f /proc/meminfo ]; then
        total_mem=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        free_mem=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        used_mem=$((total_mem - free_mem))
        percent_used=$((used_mem * 100 / total_mem))
        
        echo "📊 Memory Usage: ${percent_used}% (${used_mem}kB used of ${total_mem}kB)"
        
        # If less than 600MB free, we should free up memory
        if [ $free_mem -lt 600000 ]; then
            return 1
        else
            return 0
        fi
    else
        echo "⚠️ Unable to check memory on this system"
        return 0
    fi
}

# Function to free up memory
free_up_memory() {
    echo "🧹 Freeing up memory to improve performance..."
    
    # This works on Android/Linux
    if [ -d "/proc" ]; then
        # Get list of memory-intensive apps to stop (exclude system processes and our terminal)
        pkill -f "com.facebook" 2>/dev/null
        pkill -f "com.instagram" 2>/dev/null
        pkill -f "com.whatsapp" 2>/dev/null
        pkill -f "com.google.android.youtube" 2>/dev/null
        
        # Optimize Android if possible
        if command -v am &> /dev/null; then
            am kill-all 2>/dev/null
        fi
        
        # Optimize Linux-like systems
        sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null
    fi
    
    # Clear npm cache to free memory
    npm cache clean --force &>/dev/null
    
    echo "✅ Memory optimization complete"
}

# Check terminal dimensions to avoid line wrapping
cols=$(tput cols)
if [ "$cols" -lt 80 ]; then
    echo "⚠️ Your terminal is narrow. For best experience, use landscape mode."
fi

# Step 1: Check memory and free up if needed
echo "🔍 Checking system resources..."
check_memory
if [ $? -eq 1 ]; then
    echo "⚠️ System is low on memory. Optimizing..."
    free_up_memory
    
    # Check again after optimization
    check_memory
    if [ $? -eq 1 ]; then
        echo "⚠️ Still low on memory, but we'll try to continue."
    else
        echo "✅ Memory optimization successful!"
    fi
else
    echo "✅ System has sufficient memory."
fi

# Step 2: Create storage directory
echo "📁 Setting up storage directory..."
if [[ -d "/storage/emulated/0" ]]; then
    # For Android
    mkdir -p "/storage/emulated/0/BitNestMedia" 2>/dev/null
    STORAGE_PATH="/storage/emulated/0/BitNestMedia"
else
    # For other systems
    mkdir -p "$HOME/BitNestMedia" 2>/dev/null
    STORAGE_PATH="$HOME/BitNestMedia"
fi
echo "✅ Storage directory created at: $STORAGE_PATH"

# Step 3: Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📄 Creating environment file..."
    cp env.template .env.local
    
    # Generate random NEXTAUTH_SECRET
    random_secret=$(head /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 32 2>/dev/null)
    if [ -z "$random_secret" ]; then
        # Fallback if /dev/urandom isn't available
        random_secret=$(date +%s | sha256sum | base64 | head -c 32)
    fi
    
    # Interactive setup for Supabase
    echo ""
    echo "⚙️ Supabase Configuration"
    echo "========================="
    echo "You need to enter your Supabase credentials."
    echo "You can find these in your Supabase dashboard at: https://app.supabase.com"
    echo ""
    
    read -p "Enter your Supabase Project URL: " supabase_url
    read -p "Enter your Supabase Anon Key: " supabase_key
    
    # Update the credentials in .env.local
    sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${supabase_url}|g" .env.local 2>/dev/null
    sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabase_key}|g" .env.local 2>/dev/null
    sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=${random_secret}|g" .env.local 2>/dev/null
    sed -i "s|STORAGE_PATH=.*|STORAGE_PATH=${STORAGE_PATH}|g" .env.local 2>/dev/null
    
    # Additional configuration options
    echo ""
    echo "⚙️ Additional Configuration"
    echo "=========================="
    read -p "Set maximum number of users (default: 10): " max_users
    max_users=${max_users:-10}
    
    read -p "Set default user storage quota in GB (default: 10): " user_quota
    user_quota=${user_quota:-10}
    
    read -p "Enable HTTPS? (y/n, default: n): " enable_https
    enable_https=${enable_https:-n}
    
    if [[ $enable_https == "y" || $enable_https == "Y" ]]; then
        echo "📝 Note: You'll need to set up SSL certificates after installation."
        echo "      A guide is available in SETUP.md"
        sed -i "s|ENABLE_HTTPS=.*|ENABLE_HTTPS=true|g" .env.local 2>/dev/null
    else
        sed -i "s|ENABLE_HTTPS=.*|ENABLE_HTTPS=false|g" .env.local 2>/dev/null
    fi
    
    # Get system hostname or IP for access URL
    hostname=$(hostname 2>/dev/null)
    if [ -z "$hostname" ]; then
        # Try to get IP if hostname command failed
        hostname=$(ip route get 1 | awk '{print $7}' 2>/dev/null)
        if [ -z "$hostname" ]; then
            hostname="localhost"
        fi
    fi
    
    echo ""
    echo "✅ Environment file created with your configuration."
else
    echo "✅ Environment file already exists. Skipping configuration."
fi

# Step 4: Install dependencies
echo "📦 Installing dependencies (this may take a few minutes)..."
npm install --production --no-fund --silent

# Step 5: Run database setup
echo "🔧 Setting up Supabase database..."
echo "📝 Please run the SQL queries from SETUP.md in your Supabase SQL Editor."
echo "   You can find these at: https://app.supabase.com/project/_/sql"
echo ""
read -p "Have you run the SQL setup queries? (y/n): " sql_setup_done

if [[ $sql_setup_done != "y" && $sql_setup_done != "Y" ]]; then
    echo "⚠️ Please run the SQL setup before continuing."
    echo "   Open SETUP.md for the required SQL queries."
    echo "   Then run this script again."
    exit 1
fi

# Step 6: Create admin account
echo "👤 Setting up admin account..."
read -p "Enter admin email: " admin_email
read -p "Enter admin password: " -s admin_password
echo ""

echo "🔐 Please create this admin account using the SQL function in Supabase:"
echo ""
echo "SELECT create_admin_user('$admin_email', '$admin_password');"
echo ""
read -p "Have you created the admin account? (y/n): " admin_created

if [[ $admin_created != "y" && $admin_created != "Y" ]]; then
    echo "⚠️ Please create the admin account before continuing."
    echo "   You can do this later by running the SQL function above."
fi

# Step 7: Prepare for optimal operation
echo "🔧 Preparing BitNest for optimal performance..."

# Build for production to reduce runtime memory usage
npm run build --silent

echo "
✅ BitNest setup completed!
=================================================================="

# Show instructions
echo "📱 To run BitNest efficiently on your phone:"
echo "1. Close unused apps and termux sessions"
echo "2. Start with: ./scripts/start.sh prod"
echo "3. Access from your browser at: http://$hostname:3000"
echo "   (or https://$hostname:3000 if you enabled HTTPS)"
echo "
📝 Admin login:"
echo "1. Email: $admin_email"
echo "2. Password: (the one you entered)"
echo "
⭐ For the best experience, use:"
echo "   tmux new -s bitnest"
echo "   ./scripts/start.sh prod"
echo "   # Press Ctrl+b then d to detach (BitNest keeps running)"
echo "   # To reconnect: tmux attach -t bitnest"

# Start BitNest
echo ""
read -p "🚀 Start BitNest now? (y/n): " start_now
if [[ $start_now == "y" || $start_now == "Y" ]]; then
    echo "🚀 Starting BitNest in production mode..."
    
    # Check if tmux is available
    if command -v tmux &> /dev/null; then
        echo "📱 Starting in tmux session for background operation..."
        tmux new-session -d -s bitnest "./scripts/start.sh prod"
        echo "✅ BitNest started in background tmux session"
        echo "📝 To view the app: tmux attach -t bitnest"
        echo "📝 Access the app at: http://$hostname:3000"
    else
        # Start directly if tmux not available
        ./scripts/start.sh prod
    fi
else
    echo "📝 Start manually when ready with: ./scripts/start.sh prod"
fi 