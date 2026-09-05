import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
if (env.VITE_DATA_MODE !== 'supabase' || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)
  throw new Error('Bundle toko wajib dibuat dengan konfigurasi Supabase lengkap.');
const root = new URL('../dist/', import.meta.url);
const files = {};
async function collect(path = '') {
  for (const entry of await readdir(new URL(path, root), { withFileTypes: true })) {
    const name = path + entry.name;
    if (entry.isDirectory()) await collect(name + '/');
    else files[name] = new Uint8Array(await readFile(new URL(name, root)));
  }
}
await collect();
const html = new TextDecoder().decode(files['index.html']);
if (!html.includes('kiosku-store-binding'))
  throw new Error('Build storefront belum mendukung binding toko.');
const zip = zipSync(files, { level: 6 });
if (zip.length > 15 * 1024 * 1024) throw new Error('Bundle melampaui batas 15 MB.');
await mkdir(new URL('../.artifacts/', import.meta.url), { recursive: true });
await writeFile(new URL('../.artifacts/storefront.zip', import.meta.url), zip);
console.log(`Storefront ZIP ready: .artifacts/storefront.zip (${zip.length} bytes)`);
