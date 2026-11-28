#!/usr/bin/env bash
# ==============================================================================
# Aura PMS - Automated PostgreSQL Backup Script
# Creates a compressed custom-format dump (-Fc) with timestamping and retention
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/aura_pms_backup_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Determine database connection URL (prefer admin URL with full dump privileges)
if [ -f ".env" ]; then
  # export variables from .env if not already set
  set -a
  source <(grep -v '^#' .env | sed -e 's/\r$//')
  set +a
fi

DB_URL="${DATABASE_ADMIN_URL:-${DATABASE_URL:-}}"

if [ -z "${DB_URL}" ]; then
  echo "[-] ERROR: Neither DATABASE_ADMIN_URL nor DATABASE_URL is set in environment."
  exit 1
fi

echo "[*] Aura PMS Database Backup Started at $(date)"
echo "[*] Target backup file: ${BACKUP_FILE}"

# Execute pg_dump using custom archive format (-Fc includes compression & metadata)
pg_dump "${DB_URL}" \
  --format=custom \
  --blobs \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}"

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
  echo "[+] Backup successfully completed! File size: ${BACKUP_SIZE}"
else
  echo "[-] ERROR: Backup file was not generated or is 0 bytes."
  exit 1
fi

# Retention policy: Prune local dumps older than RETENTION_DAYS
echo "[*] Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "aura_pms_backup_*.dump" -type f -mtime "+${RETENTION_DAYS}" -exec rm -f {} +
echo "[+] Retention check complete."

# Cloud storage sync hook (Optional: AWS S3 / Cloudflare R2 / MinIO)
# Uncomment and configure S3_BUCKET if cloud backup is enabled:
# if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
#   echo "[*] Syncing backup to S3 bucket ${S3_BACKUP_BUCKET}..."
#   aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/db-backups/$(basename "${BACKUP_FILE}")"
#   echo "[+] S3 upload complete."
# fi

echo "[*] Backup job finished successfully."
