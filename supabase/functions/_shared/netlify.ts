import { unzipSync, zipSync, strFromU8, strToU8 } from 'npm:fflate@0.8.3';
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function siteBundle(template: Uint8Array, storeId: string) {
  if (!uuidPattern.test(storeId)) throw new Error('ID toko tidak valid.');
  const files = unzipSync(template);
  if (!files['index.html']) throw new Error('Bundle frontend tidak lengkap.');
  const html = strFromU8(files['index.html']);
  const marker = /<meta name="kiosku-store-binding" content="template"\s*\/?>/;
  if (!marker.test(html)) throw new Error('Bundle frontend perlu diperbarui.');
  files['index.html'] = strToU8(
    html.replace(marker, `<meta name="kiosku-store-id" content="${storeId}">`),
  );
  files['_redirects'] = strToU8('/* /index.html 200\n');
  files['_headers'] = strToU8(
    '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  X-Frame-Options: SAMEORIGIN\n',
  );
  return zipSync(files, { level: 1 });
}
export function netlifyOrigin(siteName: string) {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(siteName))
    throw new Error('Nama situs tidak valid.');
  return `https://${siteName}.netlify.app`;
}
export async function netlifyRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get('NETLIFY_AUTH_TOKEN')}`,
      'User-Agent': 'Kiosku publisher',
      ...init.headers,
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    // Never return provider bodies: they may contain account or credential details.
    const error = new Error(
      response.status === 429
        ? 'Batas publish Netlify tercapai. Coba lagi nanti.'
        : response.status === 401 || response.status === 403
          ? 'Akses Netlify belum tersedia. Hubungi pengelola.'
          : `Netlify belum dapat memproses publish (HTTP ${response.status}).`,
    );
    Object.assign(error, { status: response.status });
    throw error;
  }
  return response.json();
}
