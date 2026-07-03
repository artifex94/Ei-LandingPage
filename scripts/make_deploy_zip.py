# OBSOLETO — flujo standalone (build local → zip de .next/standalone → node server.js).
# El deploy actual es build-on-server: usar scripts/make_source_zip.py.
# Se conserva como referencia del flujo anterior.
import zipfile, os, sys, shutil
from datetime import datetime

repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
date_tag = datetime.now().strftime("%Y-%m-%d")

src = os.path.join(repo, "apps/web/.next/standalone")
dst = os.path.join(repo, f"infra/deploy/frontend/ei-landing-{date_tag}.zip")
env_dst = os.path.join(src, ".env")

print(f"Source:  {src}")
print(f"Output:  {dst}")

if not os.path.isdir(src):
    print(f"ERROR: source not found: {src}")
    sys.exit(1)

os.makedirs(os.path.dirname(dst), exist_ok=True)

# Next standalone NO incluye .next/static ni (a veces) public — copiarlos al bundle
# o el sitio sale sin CSS/JS ni imágenes.
static_src = os.path.join(repo, "apps/web/.next/static")
static_dst = os.path.join(src, ".next", "static")
if os.path.isdir(static_src):
    shutil.copytree(static_src, static_dst, dirs_exist_ok=True)
    print("Copied .next/static")
else:
    print("WARN: no se encontró .next/static (¿corriste npm run build?)")

public_src = os.path.join(repo, "apps/web/public")
public_dst = os.path.join(src, "public")
if os.path.isdir(public_src):
    shutil.copytree(public_src, public_dst, dirs_exist_ok=True)
    print("Copied public")

# Los secretos NO van en el ZIP: el VPS provee las env vars en runtime (ver
# infra/deploy/frontend/.env como referencia de qué cargar). Limpiamos cualquier
# .env que haya quedado en el standalone de una corrida anterior.
if os.path.exists(env_dst):
    os.remove(env_dst)
    print("Removed standalone/.env (los secretos NO van en el ZIP)")
else:
    print("OK: el standalone no tiene .env (secretos fuera del ZIP)")

if os.path.exists(dst):
    os.remove(dst)

count = 0
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for root, dirs, files in os.walk(src, followlinks=False):
        dirs[:] = [d for d in dirs if d != ".git"]
        for f in files:
            if f.endswith(".map"):
                continue
            fp = os.path.join(root, f)
            arcname = os.path.relpath(fp, src)
            zf.write(fp, arcname)
            count += 1

size_mb = os.path.getsize(dst) / 1024 / 1024
print(f"Done: {count} files, {size_mb:.1f} MB")
