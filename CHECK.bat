@echo off
echo Checking GUCollab Setup...
echo.

echo [1] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
echo.

echo [2] Checking dependencies...
if not exist "node_modules" (
    echo Dependencies not installed. Running npm install...
    npm install
) else (
    echo Dependencies found.
)
echo.

echo [3] Checking .env file...
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Creating default .env file...
    echo MONGODB_URI=mongodb://localhost:27017/gucollab > .env
    echo JWT_SECRET=your_secret_key_here >> .env
    echo PORT=3000 >> .env
    echo.
    echo Please edit .env file with your settings!
) else (
    echo .env file found.
)
echo.

echo [4] Checking MongoDB connection...
mongosh --eval "db.version()" 2>nul
if %errorlevel% neq 0 (
    echo WARNING: MongoDB might not be running!
    echo Make sure MongoDB is installed and running.
    echo Or use MongoDB Atlas (cloud).
) else (
    echo MongoDB connection OK.
)
echo.

echo Setup check complete!
echo.
echo To start the server, run: npm start
echo Or double-click RUN.bat
echo.
pause


