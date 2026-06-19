import zipfile, os, sys, shutil
from datetime import datetime

repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
date_tag = datetime.now().strftime("%Y-%m-%d")

src = os.path.join(repo, "frontend/Ei-LandingPage/.next/standalone")
dst = os.path.join(repo, f"deploy/frontend/ei-landing-{date_tag}.zip")
env_src = os.path.join(repo, "frontend/Ei-LandingPage/.env.local")
env_dst = os.path.join(src, ".env")

print(f"Source:  {src}")
print(f"Output:  {dst}")

if not os.path.isdir(src):
    print(f"ERROR: source not found: {src}")
    sys.exit(1)

shutil.copy2(env_src, env_dst)
print(f"Copied .env")

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
