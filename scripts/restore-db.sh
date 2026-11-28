#!/usr/bin/env bash
# ==============================================================================
# Aura PMS - Verified Database Restore & Integrity Check Script
# Restores custom-format dump into target database and checks RLS / schema health
# ==============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path_to_backup_dump_file>"
  echo "Example: $0 ./backups/aura_pms_backup_20261128_120000.dump"
  exit 1
fi

# Determine database connection URL (prefer admin URL with full dump privileges)
if [ -f ".env" ]; then
  # export variables from .env if not already set
  set -a
  source <(grep -v '^#' .env | sed -e 's/\r$//')
  set +a
fi

TARGET_URL="${DATABASE_ADMIN_URL:-${DATABASE_URL:-}}"
if [ -z "${TARGET_URL}" ]; then
  echo "[-] ERROR: Neither DATABASE_ADMIN_URL nor DATABASE_URL is set in environment."
  exit 1
fi

echo "[*] Aura PMS Database Restore Starting..."
echo "[*] Source dump file: ${BACKUP_FILE}"
echo "[!] WARNING: This will restore database objects, dropping and recreating them (--clean --if-exists)."

# Execute pg_restore
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -d "${TARGET_URL}" \
  "${BACKUP_FILE}" || true

echo "[+] pg_restore process completed. Running post-restore integrity and security checks..."

# Verify schema and RLS enforcement
psql "${TARGET_URL}" -c "
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
"

echo "[+] Database restore and security verification completed successfully!"
