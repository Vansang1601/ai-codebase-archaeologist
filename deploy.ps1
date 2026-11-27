# =============================================================================
# Automated Deployment Script for AI Codebase Archaeologist (Windows PowerShell)
# Usage: .\deploy.ps1 [-Prod]
# =============================================================================
param(
    [switch]$Prod
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  AI Codebase Archaeologist - Deployer" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Check prerequisites
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Check .env
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Write-Host "[INFO] No .env found. Copying from .env.example..." -ForegroundColor Yellow
        Copy-Item .env.example .env
        $Secret = [Convert]::ToBase64String((1..36 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
        (Get-Content .env) -replace "AUTH_SECRET=.*", "AUTH_SECRET=$Secret" | Set-Content .env
        Write-Host "[INFO] Generated new secure AUTH_SECRET in .env." -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Neither .env nor .env.example found." -ForegroundColor Red
        exit 1
    }
}

$ComposeFile = if ($Prod) { "docker-compose.prod.yml" } else { "docker-compose.yml" }
Write-Host "[MODE] Using $ComposeFile" -ForegroundColor Cyan

# 3. Build containers
Write-Host "[STEP 1/4] Building container images..." -ForegroundColor Yellow
docker compose -f $ComposeFile build

# 4. Start database and wait for health
Write-Host "[STEP 2/4] Starting PostgreSQL database..." -ForegroundColor Yellow
docker compose -f $ComposeFile up -d postgres
Write-Host "[INFO] Waiting for PostgreSQL to become healthy..." -ForegroundColor Yellow
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    $res = docker compose -f $ComposeFile exec -T postgres pg_isready -U archaeologist -d archaeologist 2>$null
    if ($LASTEXITCODE -eq 0) {
        $healthy = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $healthy) {
    Write-Host "[ERROR] PostgreSQL did not become healthy in time." -ForegroundColor Red
    exit 1
}
Write-Host "[INFO] PostgreSQL is healthy." -ForegroundColor Green

# 5. Apply database migrations
Write-Host "[STEP 3/4] Applying SQL migrations..." -ForegroundColor Yellow
Get-ChildItem backend\migrations\*.sql | ForEach-Object {
    Write-Host "  -> Applying $($_.Name)..." -ForegroundColor Gray
    Get-Content $_.FullName | docker compose -f $ComposeFile exec -i postgres psql -U archaeologist -d archaeologist | Out-Null
}

# 6. Start all services
Write-Host "[STEP 4/4] Starting all services..." -ForegroundColor Yellow
docker compose -f $ComposeFile up -d

Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Deployment Complete! Container Status:" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
docker compose -f $ComposeFile ps

Write-Host ""
if ($Prod) {
    Write-Host "Endpoints:" -ForegroundColor Cyan
    Write-Host "  - Web & API: https://localhost (or configured DOMAIN)"
} else {
    Write-Host "Endpoints:" -ForegroundColor Cyan
    Write-Host "  - Frontend: http://localhost:3000"
    Write-Host "  - Backend API: http://localhost:8000"
    Write-Host "  - API Health: http://localhost:8000/health"
    Write-Host "  - API Docs: http://localhost:8000/docs"
}
Write-Host "======================================================" -ForegroundColor Green
