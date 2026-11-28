# ==============================================================================
# Aura PMS - Automated PostgreSQL Backup Script (PowerShell)
# Creates a compressed custom-format dump (-Fc) with timestamping and retention
# ==============================================================================
param(
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 7,
    [string]$DbUrl = $env:DATABASE_ADMIN_URL
)

# Auto-load from .env if present
if (Test-Path -Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$") {
            $name = $matches[1]
            $val = $matches[2].Trim('"', "'")
            if (-not [Environment]::GetEnvironmentVariable($name)) {
                [Environment]::SetEnvironmentVariable($name, $val)
            }
        }
    }
}

if (-not $DbUrl) {
    $DbUrl = $env:DATABASE_ADMIN_URL
}
if (-not $DbUrl) {
    $DbUrl = $env:DATABASE_URL
}

if (-not $DbUrl) {
    Write-Error "[-] ERROR: Neither DATABASE_ADMIN_URL nor DATABASE_URL is set in environment."
    exit 1
}

if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupFileName = "aura_pms_backup_${Timestamp}.dump"
$BackupFilePath = Join-Path -Path $BackupDir -ChildPath $BackupFileName

Write-Host "[*] Aura PMS Database Backup Started at $(Get-Date)"
Write-Host "[*] Target backup file: $BackupFilePath"

# Execute pg_dump using custom archive format (-Fc)
& pg_dump $DbUrl --format=custom --blobs --no-owner --no-privileges --file="$BackupFilePath"

if ($LASTEXITCODE -eq 0 -and (Test-Path -Path $BackupFilePath) -and ((Get-Item $BackupFilePath).Length -gt 0)) {
    $FileSizeMB = [math]::Round(((Get-Item $BackupFilePath).Length / 1MB), 2)
    Write-Host "[+] Backup successfully completed! File size: ${FileSizeMB} MB"
} else {
    Write-Error "[-] ERROR: pg_dump failed or generated empty file."
    exit 1
}

# Retention cleanup
Write-Host "[*] Pruning local backups older than $RetentionDays days..."
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "aura_pms_backup_*.dump" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force
Write-Host "[+] Retention cleanup complete."
