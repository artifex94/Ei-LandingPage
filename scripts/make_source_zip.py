#!/usr/bin/env python3
"""
make_source_zip.py — empaqueta el CÓDIGO FUENTE de apps/web para deploy
build-on-server (Hostinger compila con `npm install && npm run build`).

A diferencia de make_deploy_zip.py (flujo standalone, ya obsoleto), este script
NO necesita un build previo: zippea la fuente versionada y el servidor la compila.

Usa `git archive` sobre HEAD:apps/web, así:
  - El contenido de apps/web queda en la RAÍZ del zip (package.json arriba de todo).
  - node_modules/, .next/ y .env* quedan FUERA (no están versionados).
  - package-lock.json SÍ entra (está versionado) → npm install reproducible.

Solo empaqueta lo COMMITEADO. Si hay cambios sin commitear que querés desplegar,
commiteá primero (el script avisa si el árbol está sucio).
"""
import os
import subprocess
import sys
from datetime import datetime

repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
date_tag = datetime.now().strftime("%Y-%m-%d")
out_dir = os.path.join(repo, "infra/deploy/frontend")
dst = os.path.join(out_dir, f"ei-source-{date_tag}.zip")


def git(*args: str) -> str:
    return subprocess.run(
        ["git", "-C", repo, *args],
        check=True, capture_output=True, text=True,
    ).stdout.strip()


# Aviso si el working tree de apps/web tiene cambios sin commitear:
# git archive solo ve lo que está en HEAD.
dirty = git("status", "--porcelain", "apps/web")
if dirty:
    print("WARN: apps/web tiene cambios SIN commitear; no entrarán al zip:")
    print(dirty)
    print("      Commiteá antes de desplegar si querés incluirlos.\n")

os.makedirs(out_dir, exist_ok=True)
if os.path.exists(dst):
    os.remove(dst)

# HEAD:apps/web hace que apps/web sea la raíz del archivo.
subprocess.run(
    ["git", "-C", repo, "archive", "--format=zip", "-o", dst, "HEAD:apps/web"],
    check=True,
)

if not os.path.exists(dst):
    print("ERROR: no se generó el zip")
    sys.exit(1)

size_mb = os.path.getsize(dst) / 1024 / 1024
print(f"Done: {dst}  ({size_mb:.1f} MB)")
print("Subir a Hostinger, descomprimir como raíz de la app Node y configurar:")
print("  Build:  npm install && npm run build")
print("  Start:  npm start")
print("  Env:    cargar las variables (ver apps/web/.env.example) ANTES del build.")
