#!/bin/bash

# BitNest Update Script
cd ~/bitnest

# Initialize log file
LOG_FILE=~/bitnest_logs/update_$(date +"%Y%m%d_%H%M%S").log
mkdir -p ~/bitnest_logs
touch $LOG_FILE

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

notify() {
  log "NOTIFICATION: $1"
  
  # Try to send email notification if mail client is configured
  if command -v mutt &> /dev/null; then
    echo "$1" | mutt -s "BitNest Update Notification" admin@example.com || true
  fi
  
  # Write to Android notification (if Termux API is installed)
  if command -v termux-notification &> /dev/null; then
    termux-notification --title "BitNest Update" --content "$1" || true
  fi
}

# Main update function
perform_update() {
  # Backup current version
  log "Creating backup..."
  timestamp=$(date +"%Y%m%d_%H%M%S")
  mkdir -p ~/bitnest_backups
  cp -r ~/bitnest ~/bitnest_backups/bitnest_$timestamp
  
  # Get current branch
  current_branch=$(git branch --show-current)
  log "Current branch: $current_branch"
  
  # Always prefer main branch for updates
  target_branch="main"
  
  # Check if main branch exists and get commit hash
  git fetch origin main
  main_exists=$?
  
  if [ $main_exists -ne 0 ]; then
    log "Main branch not found. Falling back to backup branch."
    target_branch="backup"
    git fetch origin backup
  fi
  
  # Get current commit hash
  current=$(git rev-parse HEAD)
  # Get remote commit hash
  remote=$(git rev-parse origin/$target_branch)
  
  if [ "$current" == "$remote" ]; then
    log "Already up to date with $target_branch branch. Skipping update."
    return 0
  fi
  
  log "Updating from $current to $remote on $target_branch branch..."
  
  # Pull changes from target branch
  git pull origin $target_branch
  
  # Install dependencies
  log "Installing dependencies..."
  npm install
  
  # Build the application
  log "Building the application..."
  npm run build
  build_status=$?
  
  if [ $build_status -ne 0 ]; then
    error_msg="Build failed! Rolling back to previous version."
    log "$error_msg"
    notify "$error_msg"
    
    # Rollback procedure
    log "Performing rollback..."
    
    # If attempted to update to main and it failed, try backup branch
    if [ "$target_branch" == "main" ]; then
      log "Attempting to use backup branch instead..."
      git fetch origin backup
      git reset --hard origin/backup
      
      # Try building with backup branch
      npm install
      npm run build
      backup_build_status=$?
      
      if [ $backup_build_status -ne 0 ]; then
        log "Backup branch build also failed. Restoring from file backup..."
        # Stop the current version
        pm2 stop bitnest
        
        # Restore the backup
        rm -rf ~/bitnest
        cp -r ~/bitnest_backups/bitnest_$timestamp ~/bitnest
        
        # Restart from backup
        cd ~/bitnest
        npm install
        npm run build
        pm2 restart bitnest
        
        notify "Critical failure! Restored from file backup. Please check logs."
      else
        log "Successfully rolled back to backup branch."
        pm2 restart bitnest
        notify "Update to main branch failed. Successfully rolled back to backup branch."
      fi
    else
      # If we were already trying the backup branch, just restore from file backup
      log "Restoring from file backup..."
      # Stop the current version
      pm2 stop bitnest
      
      # Restore the backup
      rm -rf ~/bitnest
      cp -r ~/bitnest_backups/bitnest_$timestamp ~/bitnest
      
      # Restart from backup
      cd ~/bitnest
      npm install
      npm run build
      pm2 restart bitnest
      
      notify "Critical failure! Restored from file backup. Please check logs."
    fi
    
    return 1
  fi
  
  # Restart the application
  log "Restarting the application..."
  pm2 restart bitnest
  
  # Health check
  log "Performing health check..."
  sleep 20 # Wait 20 seconds for app to start
  
  # Try to access the application
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
  
  if [ $response -eq 200 ]; then
    log "Update successful!"
    notify "BitNest has been successfully updated to the latest version."
  else
    error_msg="Health check failed with response code $response! Rolling back..."
    log "$error_msg"
    notify "$error_msg"
    
    # Stop the current version
    pm2 stop bitnest
    
    # Restore the backup
    rm -rf ~/bitnest
    cp -r ~/bitnest_backups/bitnest_$timestamp ~/bitnest
    
    # Restart from backup
    cd ~/bitnest
    pm2 restart bitnest
    
    log "Rollback complete."
    notify "Automatic rollback completed due to health check failure."
    
    return 1
  fi
  
  # If this was a successful update to main, update the backup branch too
  if [ "$target_branch" == "main" ]; then
    log "Updating backup branch to previous main version..."
    git checkout -b backup_update
    git reset --hard HEAD~1  # One commit behind main
    git push -f origin backup_update:backup
    git checkout $current_branch  # Return to original branch
  fi
  
  return 0
}

# If script is run manually, perform update immediately
if [ "$1" != "--cron" ]; then
  perform_update
  exit $?
fi

# Schedule automatic updates every Sunday at 5:00 AM
setup_cron() {
  # Check if crontab entry already exists
  existing_cron=$(crontab -l 2>/dev/null | grep -q "BitNest automatic update" && echo "exists")
  
  if [ "$existing_cron" != "exists" ]; then
    # Add cron job to user's crontab
    (crontab -l 2>/dev/null; echo "# BitNest automatic update every Sunday at 5:00 AM") | crontab -
    (crontab -l 2>/dev/null; echo "0 5 * * 0 ~/bitnest/scripts/update.sh --cron") | crontab -
    log "Scheduled automatic updates every Sunday at 5:00 AM"
  else
    log "Automatic update schedule already exists"
  fi
}

# Set up cron job during installation
if [ "$1" == "--setup" ]; then
  setup_cron
  exit 0
fi

# If run from cron, check if it's Sunday 5:00 AM
if [ "$1" == "--cron" ]; then
  day_of_week=$(date +"%u")
  hour=$(date +"%H")
  
  # If it's Sunday (day 7) and 5 AM
  if [ "$day_of_week" == "7" ] && [ "$hour" == "05" ]; then
    perform_update
  else
    log "Not update time. Current: Day $(date +"%A"), Hour $(date +"%H")"
  fi
fi

exit 0 