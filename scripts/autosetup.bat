@echo off
echo 🚀 BitNest Auto Setup - The simplest way to set up your personal cloud
echo ==================================================================

:: Function to check memory and free up if needed
echo 🔍 Checking system resources...

:: Get system memory info using PowerShell
powershell -Command "$mem = Get-CimInstance Win32_OperatingSystem; $total = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2); $free = [math]::Round($mem.FreePhysicalMemory / 1MB, 2); $used = $total - $free; $percent = [math]::Round(($used / $total) * 100, 2); Write-Output \"📊 Memory Usage: ${percent}% (${used}GB used of ${total}GB)\"; if($free -lt 0.6){exit 1}else{exit 0}"

:: Check if we need to free up memory
if %ERRORLEVEL% EQU 1 (
    echo ⚠️ System is low on memory. Optimizing...
    
    :: Free up memory - Close common resource-heavy processes
    echo 🧹 Closing non-essential applications to free memory...
    taskkill /F /IM chrome.exe /T 2>nul
    taskkill /F /IM msedge.exe /T 2>nul
    taskkill /F /IM firefox.exe /T 2>nul
    taskkill /F /IM spotify.exe /T 2>nul
    
    :: Clear temp files
    echo 🧹 Clearing temporary files...
    powershell -Command "Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue"
    
    :: Clear npm cache to free memory
    call npm cache clean --force >nul 2>&1
    
    echo ✅ Memory optimization complete
) else (
    echo ✅ System has sufficient memory.
)

:: Create storage directory
echo 📁 Setting up storage directory...
mkdir "C:\BitNestMedia" 2>nul
set STORAGE_PATH=C:\BitNestMedia
echo ✅ Storage directory created at: %STORAGE_PATH%

:: Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo 📄 Creating environment file...
    copy env.template .env.local
    
    :: Generate random NEXTAUTH_SECRET using PowerShell
    for /f "delims=" %%i in ('powershell -Command "[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid()))"') do set random_secret=%%i
    
    echo.
    echo ⚙️ Supabase Configuration
    echo =========================
    echo You need to enter your Supabase credentials.
    echo You can find these in your Supabase dashboard at: https://app.supabase.com
    echo.
    
    set /p supabase_url=Enter your Supabase Project URL: 
    set /p supabase_key=Enter your Supabase Anon Key: 
    
    :: Update the credentials in .env.local using PowerShell
    powershell -Command "(Get-Content .env.local) -replace 'NEXT_PUBLIC_SUPABASE_URL=.*', 'NEXT_PUBLIC_SUPABASE_URL=%supabase_url%' | Set-Content .env.local"
    powershell -Command "(Get-Content .env.local) -replace 'NEXT_PUBLIC_SUPABASE_ANON_KEY=.*', 'NEXT_PUBLIC_SUPABASE_ANON_KEY=%supabase_key%' | Set-Content .env.local"
    powershell -Command "(Get-Content .env.local) -replace 'NEXTAUTH_SECRET=.*', 'NEXTAUTH_SECRET=%random_secret%' | Set-Content .env.local"
    powershell -Command "(Get-Content .env.local) -replace 'STORAGE_PATH=.*', 'STORAGE_PATH=%STORAGE_PATH%' | Set-Content .env.local"
    
    :: Additional configuration options
    echo.
    echo ⚙️ Additional Configuration
    echo ==========================
    set /p max_users=Set maximum number of users (default: 10): 
    if "%max_users%"=="" set max_users=10
    
    set /p user_quota=Set default user storage quota in GB (default: 10): 
    if "%user_quota%"=="" set user_quota=10
    
    set /p enable_https=Enable HTTPS? (y/n, default: n): 
    if "%enable_https%"=="" set enable_https=n
    
    if /i "%enable_https%"=="y" (
        echo 📝 Note: You'll need to set up SSL certificates after installation.
        echo       A guide is available in SETUP.md
        powershell -Command "(Get-Content .env.local) -replace 'ENABLE_HTTPS=.*', 'ENABLE_HTTPS=true' | Set-Content .env.local"
    ) else (
        powershell -Command "(Get-Content .env.local) -replace 'ENABLE_HTTPS=.*', 'ENABLE_HTTPS=false' | Set-Content .env.local"
    )
    
    :: Get system hostname or IP for access URL
    for /f "delims=" %%i in ('powershell -Command "[System.Net.Dns]::GetHostName()"') do set hostname=%%i
    
    echo.
    echo ✅ Environment file created with your configuration.
) else (
    echo ✅ Environment file already exists. Skipping configuration.
)

:: Install dependencies
echo 📦 Installing dependencies (this may take a few minutes)...
call npm install --production --no-fund --silent

:: Run database setup
echo 🔧 Setting up Supabase database...
echo 📝 Please run the SQL queries from SETUP.md in your Supabase SQL Editor.
echo    You can find these at: https://app.supabase.com/project/_/sql
echo.
set /p sql_setup_done=Have you run the SQL setup queries? (y/n): 

if /i not "%sql_setup_done%"=="y" (
    echo ⚠️ Please run the SQL setup before continuing.
    echo    Open SETUP.md for the required SQL queries.
    echo    Then run this script again.
    goto end
)

:: Create admin account
echo 👤 Setting up admin account...
set /p admin_email=Enter admin email: 
set /p admin_password=Enter admin password: 

echo.
echo 🔐 Please create this admin account using the SQL function in Supabase:
echo.
echo SELECT create_admin_user('%admin_email%', '%admin_password%');
echo.
set /p admin_created=Have you created the admin account? (y/n): 

if /i not "%admin_created%"=="y" (
    echo ⚠️ Please create the admin account before continuing.
    echo    You can do this later by running the SQL function above.
)

:: Prepare for optimal operation
echo 🔧 Preparing BitNest for optimal performance...

:: Build for production to reduce runtime memory usage
call npm run build --silent

echo.
echo ✅ BitNest setup completed!
echo ==================================================================

:: Show instructions
echo 📱 To run BitNest efficiently:
echo 1. Close unused applications to free up memory
echo 2. Start with: scripts\start.bat prod
echo 3. Access from your browser at: http://%hostname%:3000
echo    (or https://%hostname%:3000 if you enabled HTTPS)
echo.
echo 📝 Admin login:
echo 1. Email: %admin_email%
echo 2. Password: (the one you entered)

:: Start BitNest prompt
echo.
set /p start_now=🚀 Start BitNest now? (y/n): 
if /i "%start_now%"=="y" (
    echo 🚀 Starting BitNest in production mode...
    call scripts\start.bat prod
) else (
    echo 📝 Start manually when ready with: scripts\start.bat prod
)

:end
pause 