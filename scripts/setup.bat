@echo off
echo 🌟 Welcome to BitNest Setup 🌟
echo ------------------------------

:: Create storage directory
echo 📁 Setting up storage directory...
mkdir "C:\BitNestMedia" 2>nul

:: Check if .env.local exists
if not exist ".env.local" (
  echo 📄 Creating .env.local file...
  copy env.template .env.local
  echo ⚙️ Please edit .env.local with your Supabase credentials
) else (
  echo ✅ .env.local already exists
)

:: Install dependencies
echo 📦 Installing dependencies...
call npm install

echo.
echo ✅ BitNest setup completed!
echo ------------------------------
echo To start BitNest:
echo   npm run dev
echo.
echo Access BitNest at:
echo   http://localhost:3000
echo.

pause 