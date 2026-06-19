#!/usr/bin/env bash
# run-tests.sh — Ejecuta todos los tests del proyecto EscobarInstalaciones
# Uso: ./scripts/run-tests.sh [--solo-unit] [--solo-browser] [--con-auth]
set -euo pipefail

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
fail() { echo -e "${RED}✗${RESET} $*"; }
info() { echo -e "${BLUE}→${RESET} $*"; }
sep()  { echo -e "${BOLD}$*${RESET}"; }

# ─── Flags ────────────────────────────────────────────────────────────────────
SOLO_UNIT=false
SOLO_BROWSER=false
CON_AUTH=false

for arg in "$@"; do
  case $arg in
    --solo-unit)    SOLO_UNIT=true ;;
    --solo-browser) SOLO_BROWSER=true ;;
    --con-auth)     CON_AUTH=true ;;
    --help|-h)
      echo "Uso: $0 [--solo-unit] [--solo-browser] [--con-auth]"
      echo ""
      echo "  --solo-unit     Solo tests unitarios (billing-state, no necesita browser)"
      echo "  --solo-browser  Solo tests de browser (a11y + flujos)"
      echo "  --con-auth      Pasa TEST_USER_EMAIL y TEST_USER_PASSWORD al runner"
      echo ""
      echo "Variables de entorno para auth:"
      echo "  TEST_USER_EMAIL=...    Email de usuario de test"
      echo "  TEST_USER_PASSWORD=... Contraseña de usuario de test"
      exit 0
      ;;
  esac
done

# ─── Header ───────────────────────────────────────────────────────────────────
echo ""
sep "══════════════════════════════════════════════════════"
sep "  Tests — EscobarInstalaciones"
sep "══════════════════════════════════════════════════════"
echo ""

# ─── Directorio del proyecto ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"
info "Directorio: $PROJECT_DIR"
echo ""

# ─── Verificar dependencias del sistema para Chromium ────────────────────────
check_browser_deps() {
  if ldconfig -p 2>/dev/null | grep -q "libnspr4"; then
    return 0
  fi
  # Intento alternativo: ver si el binario de chrome corre
  CHROME_BIN="$HOME/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell"
  if [ -f "$CHROME_BIN" ]; then
    if "$CHROME_BIN" --version 2>/dev/null | grep -q "Chromium\|Chrome"; then
      return 0
    fi
  fi
  return 1
}

BROWSER_OK=false
if ! $SOLO_UNIT; then
  sep "── Verificando dependencias de browser ────────────────"
  if check_browser_deps; then
    ok "Dependencias del sistema OK"
    BROWSER_OK=true
  else
    warn "Faltan dependencias del sistema para Chromium (libnspr4, libnss3, etc.)"
    info "Intentando instalar con sudo..."
    if sudo npx playwright install-deps chromium 2>&1; then
      ok "Dependencias instaladas correctamente"
      BROWSER_OK=true
    else
      warn "No se pudo instalar automáticamente."
      warn "Instalá manualmente con:"
      echo "    sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 \\"
      echo "         libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \\"
      echo "         libxfixes3 libxrandr2 libgbm1 libasound2t64"
      if $SOLO_BROWSER; then
        fail "Abortando (--solo-browser requiere browser funcional)"
        exit 1
      fi
      warn "Continuando solo con tests unitarios..."
      SOLO_UNIT=true
    fi
  fi
  echo ""
fi

# ─── Resultados acumulados ────────────────────────────────────────────────────
TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_SUITES=()

run_suite() {
  local label="$1"
  local cmd="$2"

  sep "── $label ────────────────────────────────────────────"
  if eval "$cmd"; then
    ok "$label: PASÓ"
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    fail "$label: FALLÓ"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    FAILED_SUITES+=("$label")
  fi
  echo ""
}

# ─── 1. Tests unitarios — billing-state (no requieren browser) ───────────────
if ! $SOLO_BROWSER; then
  run_suite "Unit tests — billing-state" \
    "npx playwright test tests/billing.spec.ts --project=public 2>&1"
fi

# ─── 2. Tests de browser ─────────────────────────────────────────────────────
if ! $SOLO_UNIT && $BROWSER_OK; then

  # Construir variables de auth si aplica
  AUTH_ENV=""
  if $CON_AUTH; then
    if [ -z "${TEST_USER_EMAIL:-}" ] || [ -z "${TEST_USER_PASSWORD:-}" ]; then
      warn "--con-auth activo pero TEST_USER_EMAIL o TEST_USER_PASSWORD no están definidas"
      warn "Los tests de portal usarán sesión vacía (redirigirán a /login)"
    else
      AUTH_ENV="TEST_USER_EMAIL='${TEST_USER_EMAIL}' TEST_USER_PASSWORD='${TEST_USER_PASSWORD}'"
      info "Auth: ${TEST_USER_EMAIL}"
    fi
  fi

  # 2a. Setup de sesión (solo si hay credenciales)
  if $CON_AUTH && [ -n "${TEST_USER_EMAIL:-}" ]; then
    sep "── Setup de sesión ────────────────────────────────────"
    info "Generando storageState para tests autenticados..."
    eval "$AUTH_ENV npx playwright test tests/auth.setup.ts 2>&1" || warn "Setup de sesión falló — los tests de portal omitirán auth"
    echo ""
  fi

  # 2b. Tests de accesibilidad (a11y)
  run_suite "A11y — WCAG 2.2 AA" \
    "npx playwright test tests/a11y.spec.ts --project=public 2>&1"

  # 2c. Tests E2E de flujos
  run_suite "E2E — Flujos funcionales" \
    "npx playwright test tests/flujos.spec.ts --project=autenticado 2>&1"
fi

# ─── Resumen final ────────────────────────────────────────────────────────────
echo ""
sep "══════════════════════════════════════════════════════"
sep "  Resultado final"
sep "══════════════════════════════════════════════════════"
echo ""

if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
  ok "${BOLD}Todas las suites pasaron ($TOTAL_PASS/$((TOTAL_PASS + TOTAL_FAIL)))${RESET}"
else
  fail "${BOLD}$TOTAL_FAIL suite(s) fallaron:${RESET}"
  for suite in "${FAILED_SUITES[@]}"; do
    echo "    - $suite"
  done
  echo ""
  info "Reporte HTML: npx playwright show-report"
fi

echo ""
[ $TOTAL_FAIL -eq 0 ] && exit 0 || exit 1
