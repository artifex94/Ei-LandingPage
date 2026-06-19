/**
 * Prueba que el bucket "facturas" de Supabase Storage funciona.
 * Uso: npx tsx --env-file=.env.local scripts/test-bucket-facturas.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("── Test bucket facturas ─────────────────────────────────────\n");

  // 1. Subir un PDF mínimo válido (1 página en blanco)
  const pdfMinimo = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj " +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n" +
    "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
    "0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\n" +
    "startxref\n190\n%%EOF"
  );

  const filename = `TEST-${Date.now()}.pdf`;
  console.log(`Subiendo archivo de prueba: ${filename}`);

  const { error: uploadError } = await supabase.storage
    .from("facturas")
    .upload(filename, pdfMinimo, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error(`✗ Error al subir: ${uploadError.message}`);
    process.exit(1);
  }

  console.log("✓ Archivo subido correctamente");

  // 2. Obtener URL pública
  const { data } = supabase.storage.from("facturas").getPublicUrl(filename);
  console.log(`✓ URL pública: ${data.publicUrl}`);

  // 3. Verificar que la URL es accesible (HEAD request)
  const res = await fetch(data.publicUrl, { method: "HEAD" });
  if (res.ok) {
    console.log(`✓ URL accesible (HTTP ${res.status})`);
  } else {
    console.warn(`⚠  URL devuelve HTTP ${res.status} — verificá que el bucket sea público`);
  }

  // 4. Limpiar archivo de prueba
  await supabase.storage.from("facturas").remove([filename]);
  console.log("✓ Archivo de prueba eliminado\n");

  console.log("── Bucket facturas: OK ──────────────────────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); });
