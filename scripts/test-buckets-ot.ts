/**
 * Uso: npx tsx --env-file=.env.local scripts/test-buckets-ot.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testBucket(bucket: string) {
  const filename = `TEST-${Date.now()}.txt`;
  const body = Buffer.from("test");

  const { error } = await supabase.storage.from(bucket).upload(filename, body, { upsert: true });
  if (error) { console.error(`  ✗ ${bucket}: ${error.message}`); return; }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  const res = await fetch(data.publicUrl, { method: "HEAD" });
  await supabase.storage.from(bucket).remove([filename]);

  if (res.ok) {
    console.log(`  ✓ ${bucket} — OK (HTTP ${res.status})`);
  } else {
    console.warn(`  ⚠  ${bucket} — URL devuelve HTTP ${res.status} (verificá que sea público)`);
  }
}

async function main() {
  console.log("── Test buckets OT ──────────────────────────────────────────\n");
  await testBucket("ot-fotos");
  await testBucket("ot-firmas");
  console.log("\n── Listo ────────────────────────────────────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); });
