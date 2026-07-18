# Legacy Control Lab — Docker install helper (Windows)
# Requires Docker Desktop. No Node.js needed.
#
# Usage (from anywhere):
#   powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1

$ErrorActionPreference = "Stop"

function Test-Docker {
  return [bool](Get-Command docker -ErrorAction SilentlyContinue)
}

function Test-DockerEngine {
  docker info *> $null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-Docker)) {
  Write-Host "The Docker command is not available yet." -ForegroundColor Red
  Write-Host "  1. Finish installing Docker Desktop"
  Write-Host "  2. Restart Windows if the installer requested it"
  Write-Host "  3. Start Docker Desktop and wait until it says Engine running"
  Write-Host "  4. Open a NEW PowerShell window (so PATH picks up docker)"
  Write-Host "  5. Run this script again"
  Write-Host ""
  Write-Host "  https://www.docker.com/products/docker-desktop/"
  exit 1
}

if (-not (Test-DockerEngine)) {
  Write-Host "Docker is installed, but its engine is not ready." -ForegroundColor Red
  Write-Host "Open Docker Desktop and wait until it says Engine running, then try again."
  exit 1
}

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  Write-Host ""
  Write-Host "Building and starting Legacy Control Lab..." -ForegroundColor Cyan
  Write-Host "First build often takes 3-5 minutes. Leave this window open." -ForegroundColor DarkGray
  Write-Host ""
  docker compose up -d --build
  if ($LASTEXITCODE -ne 0) {
    throw "Docker could not build or start the lab."
  }

  Write-Host ""
  Write-Host "Waiting for the lab health check..." -ForegroundColor Cyan
  $healthy = $false
  for ($attempt = 1; $attempt -le 60; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/health" -TimeoutSec 2
      if ($health.ok) {
        $healthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $healthy) {
    Write-Host ""
    Write-Host "The container started, but the lab did not become healthy." -ForegroundColor Red
    Write-Host "Recent container output:" -ForegroundColor Yellow
    docker compose logs --tail 100
    exit 1
  }

  Write-Host ""
  Write-Host "Legacy Control Lab is ready." -ForegroundColor Green
  Write-Host "  http://localhost:8080/lab/" -ForegroundColor Green
  Write-Host ""
  Write-Host "Sign-on cheat sheet:" -ForegroundColor DarkGray
  Write-Host "  DEMO / TRAIN     Five-Minute Demo"
  Write-Host "  IONGRC / IONGRC  i on GRC"
  Write-Host "  AUDIT / TRAIN    Auditor"
  Write-Host "  QSECOFR / TRAIN  Privileged"
  Write-Host ""
  Write-Host "The lab keeps running in Docker Desktop after this window closes."
  Write-Host "Stop it later with: docker compose down"
  Write-Host ""

  Start-Process "http://localhost:8080/lab/"
} finally {
  Pop-Location
}
