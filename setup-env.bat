@echo off
echo Creating .env file...
if exist ".env" (
    echo .env file already exists!
    pause
    exit /b
)

echo MONGODB_URI=mongodb://localhost:27017/gucollab > .env
echo JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars >> .env
echo PORT=3000 >> .env
echo EMAIL_HOST=smtp.gmail.com >> .env
echo EMAIL_PORT=587 >> .env
echo EMAIL_USER= >> .env
echo EMAIL_PASS= >> .env

echo.
echo .env file created successfully!
echo.
echo IMPORTANT: Edit .env file and change JWT_SECRET to a secure random string!
echo.
pause


