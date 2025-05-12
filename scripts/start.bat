@echo off

:: BitNest Start Script for Windows
:: Usage: scripts\start.bat [prod|dev|test]

:: Handle arguments
set MODE=dev
set TEST_MODE=false

if "%1"=="prod" (
    set MODE=prod
) else if "%1"=="test" (
    set MODE=dev
    set TEST_MODE=true
)

echo 🚀 Starting BitNest in %MODE% mode...

:: Set environment variables
set NODE_ENV=%MODE%
set TEST_MODE=%TEST_MODE%

:: Detect environment
set IS_MOBILE=false
echo 💻 Running on desktop

:: Initialize container registry
if not defined MEDIA_ROOT (
    set STORAGE_PATH=C:\BitNestMedia
) else (
    set STORAGE_PATH=%MEDIA_ROOT%
)

set CONTAINER_REGISTRY=%STORAGE_PATH%\.containers
mkdir %CONTAINER_REGISTRY% 2>nul

:: Ensure registry.json exists
if not exist "%CONTAINER_REGISTRY%\registry.json" (
    echo {} > "%CONTAINER_REGISTRY%\registry.json"
    echo 📁 Created container registry
)

:: Container settings for test mode
if "%TEST_MODE%"=="true" (
    echo ⚠️ Running in TEST MODE with 5GB container limit
    set MAX_CONTAINER_SIZE_BYTES=5368709120
)

:: Start the application based on mode
if "%MODE%"=="prod" (
    :: Starting in production mode
    echo 👨‍💼 Starting in production mode...
    
    :: Clear NPM cache to free memory
    call npm cache clean --force >nul 2>&1
    
    :: Run with optimized settings
    node server.js
) else (
    :: Start in development mode
    echo 🔧 Starting in development mode...
    call npm run dev
)

:: Check if the storage directory exists
if not exist "C:\BitNestMedia" (
  echo 📁 Creating storage directory...
  mkdir "C:\BitNestMedia" 2>nul
)

:: Check if .env.local exists
if not exist ".env.local" (
  echo 📄 Creating .env.local file...
  copy env.template .env.local
  echo ⚙️ Please edit .env.local with your Supabase credentials
)

:: Check for SSL certificate configuration
set HTTPS_MODE=false
findstr "SSL_CERT_PATH" .env.local >nul 2>&1
if not errorlevel 1 (
  echo 🔒 SSL certificates detected
  set HTTPS_MODE=true
)

:: Check for dotenv package
if "%HTTPS_MODE%"=="true" (
  call npm list dotenv >nul 2>&1
  if errorlevel 1 (
    echo 📦 Installing dotenv package for HTTPS support...
    call npm install --save dotenv
  )
)

:: Check for HTTPS argument
if "%1"=="https" (
  echo 🔒 Forcing HTTPS mode...
  set HTTPS_MODE=true
)

:: Check for production mode
if "%1"=="prod" (
  set PROD_MODE=true
) else if "%1"=="production" (
  set PROD_MODE=true
) else if "%2"=="prod" (
  set PROD_MODE=true
) else if "%2"=="production" (
  set PROD_MODE=true
) else (
  set PROD_MODE=false
)

:: Start in appropriate mode
if "%PROD_MODE%"=="true" (
  echo 🔧 Starting in production mode...
  call npm run build
  
  if "%HTTPS_MODE%"=="true" (
    echo 🌐 Starting with HTTPS enabled...
    call npm run start:https
  ) else (
    call npm run start
  )
) else (
  echo 🔧 Starting in development mode...
  echo 💡 For better performance, use "scripts\start.bat prod" instead
  
  if "%HTTPS_MODE%"=="true" (
    echo ⚠️ HTTPS is only supported in production mode
    echo 💡 Try "scripts\start.bat prod https" for HTTPS
  )
  
  call npm run dev
)

:: Script will exit when the npm command completes
:: or when user presses Ctrl+C 