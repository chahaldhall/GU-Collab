@echo off
echo Finding process using port 3000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process ID: %%a
    taskkill /PID %%a /F
)

echo.
echo Port 3000 should now be free!
echo You can now run: npm start
echo.
pause


