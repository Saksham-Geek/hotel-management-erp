# ==============================================================================
# Aura PMS - Verified Database Restore & Integrity Check Script (PowerShell)
# Restores custom-format dump into target database and checks RLS / schema health
# ==============================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$TargetDbUrl = $env:DATABASE_ADMIN_URL
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

if (-not $TargetDbUrl) {
    $TargetDbUrl = $env:DATABASE_ADMIN_URL
}
if (-not $TargetDbUrl) {
    $TargetDbUrl = $env:DATABASE_URL
}

if (-not $TargetDbUrl) {
    Write-Error "[-] ERROR: Neither DATABASE_ADMIN_URL nor DATABASE_URL is set in environment."
    exit 1
}

if (-not (Test-Path -Path $BackupFile)) {
    Write-Error "[-] ERROR: Backup file '$BackupFile' does not exist."
    exit 1
}

Write-Host "[*] Aura PMS Database Restore Starting..."
Write-Host "[*] Source dump file: $BackupFile"
Write-Host "[!] Restoring with --clean --if-exists --no-owner --no-privileges..."

& pg_restore --clean --if-exists --no-owner --no-privileges -d $TargetDbUrl $BackupFile

Write-Host "[+] pg_restore finished. Running post-restore security and integrity audit..."

$VerifySql = @"
DO '
DECLARE
  v_tenants INT;
  v_props INT;
  v_rls_off INT;
  v_app_bypass BOOLEAN;
BEGIN
  SELECT count(*) INTO v_tenants FROM tenants;
  SELECT count(*) INTO v_props FROM properties;
  
  SELECT count(*) INTO v_rls_off
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = ''public''
    AND t.tablename IN (''reservations'', ''reservation_folios'', ''folio_items'', ''tax_invoices'', ''guests'')
    AND c.relrowsecurity = false;
    
  IF v_rls_off > 0 THEN
    RAISE EXCEPTION ''RESTORE AUDIT FAILED: % core tables are missing Row-Level Security!'', v_rls_off;
  END IF;

  SELECT rolbypassrls INTO v_app_bypass FROM pg_roles WHERE rolname = ''erp_app'';
  IF v_app_bypass IS TRUE THEN
    RAISE EXCEPTION ''RESTORE AUDIT FAILED: erp_app has rolbypassrls=TRUE!'';
  END IF;

  RAISE NOTICE ''AUDIT PASSED: % tenants, % properties restored. RLS active and verified.'', v_tenants, v_props;
END;
';
"@

& psql $TargetDbUrl -c $VerifySql

if ($LASTEXITCODE -eq 0) {
    Write-Host "[+] Database restore and security verification completed successfully!"
} else {
    Write-Error "[-] Database restore verification failed!"
    exit 1
}
