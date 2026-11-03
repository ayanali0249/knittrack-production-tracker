# KnitTrack Secure Database Setup Script
# Prompts for PostgreSQL password locally without displaying it on screen

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   KnitTrack - Local Database Setup and Seeding     " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psqlPath)) {
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd) { 
        $psqlPath = $psqlCmd.Path 
    }
}

# Prompt password securely (masked input, never echoed)
Write-Host "Please enter the password for your local PostgreSQL 'postgres' user." -ForegroundColor Yellow
$securePwd = Read-Host "PostgreSQL Password" -AsSecureString
$plainPwd = [System.Net.NetworkCredential]::new('', $securePwd).Password

$env:PGPASSWORD = $plainPwd

Write-Host "`n[1/5] Testing PostgreSQL connection..." -ForegroundColor Cyan
try {
    $testResult = & $psqlPath -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "SELECT 1" 2>&1
    if ($LASTEXITCODE -ne 0 -or $testResult -notmatch "1") {
        Write-Host "Authentication failed: Please verify your password and try again." -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Connected successfully to PostgreSQL 17." -ForegroundColor Green
} catch {
    Write-Host "Connection error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/5] Checking for 'knittrack' database..." -ForegroundColor Cyan
$existingDbs = & $psqlPath -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "SELECT datname FROM pg_database WHERE datname='knittrack'"
if ($existingDbs -match "knittrack") {
    Write-Host "  [OK] Database 'knittrack' already exists (preserving existing data)." -ForegroundColor Green
} else {
    Write-Host "  Creating 'knittrack' database..." -ForegroundColor Yellow
    & $psqlPath -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE knittrack;" | Out-Null
    Write-Host "  [OK] Database 'knittrack' created successfully." -ForegroundColor Green
}

Write-Host "`n[3/5] Configuring backend/.env..." -ForegroundColor Cyan
$escapedPwd = [System.Uri]::EscapeDataString($plainPwd)
$dbUrl = "postgresql://postgres:${escapedPwd}@127.0.0.1:5432/knittrack?schema=public"

$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 36 | ForEach-Object { [char]$_ })

$envLines = @(
    "# KnitTrack Environment Configuration",
    "DATABASE_URL=""$dbUrl""",
    "JWT_SECRET=""$jwtSecret""",
    "JWT_EXPIRES_IN=""24h""",
    "PORT=3001",
    "NODE_ENV=""development""",
    "FRONTEND_URL=""http://localhost:5173""",
    "GEMINI_API_KEY=""""",
    "UPLOAD_DIR=""./uploads""",
    "MAX_FILE_SIZE_MB=5"
)
$envContent = $envLines -join "`r`n"

$envPath = "C:\Users\ayana\OneDrive\Documents\Project\backend\.env"
Set-Content -Path $envPath -Value $envContent -Encoding ascii
Write-Host "  [OK] backend/.env written securely." -ForegroundColor Green

Write-Host "`n[4/5] Applying schema and migrations..." -ForegroundColor Cyan
Set-Location "C:\Users\ayana\OneDrive\Documents\Project\backend"
npx prisma generate
npx prisma db push

Write-Host "`n[5/5] Seeding database with assessment orders & demo accounts..." -ForegroundColor Cyan
npm run db:seed

Write-Host "`nVerifying assessment orders in PostgreSQL..." -ForegroundColor Cyan
$querySql = 'SELECT \"poNumber\", \"styleName\", \"totalQuantity\" FROM \"ProductionOrder\" ORDER BY \"poNumber\"'
$orders = & $psqlPath -h 127.0.0.1 -p 5432 -U postgres -d knittrack -tAc $querySql 2>&1

if ($LASTEXITCODE -ne 0 -or $orders -match "ERROR" -or ($orders | Measure-Object).Count -eq 0) {
    Write-Host "`n[ERROR] Verification failed: Unable to query orders from 'knittrack' database." -ForegroundColor Red
    Write-Host "Error details: $orders" -ForegroundColor Red
    $plainPwd = $null
    $env:PGPASSWORD = $null
    exit 1
}

Write-Host "Seeded Orders in 'knittrack':" -ForegroundColor Green
$orders | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

# Clear sensitive password from memory
$plainPwd = $null
$env:PGPASSWORD = $null
[System.GC]::Collect()

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "   Database setup and seeding completed successfully! " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
