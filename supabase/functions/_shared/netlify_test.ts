import { siteBundle, netlifyOrigin } from './netlify.ts';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'npm:fflate@0.8.3';
function assert(value: boolean) { if (!value) throw new Error('Assertion failed'); }
Deno.test('store bundle binds a stable store id and preserves the app assets and SPA fallback',()=>{
  const input=zipSync({'index.html':strToU8('<head><meta name="kiosku-store-binding" content="template"/></head>'),'assets/app.js':strToU8('app')});
  const files=unzipSync(siteBundle(input,'11111111-1111-4111-8111-111111111111'));
  assert(strFromU8(files['index.html']).includes('name="kiosku-store-id" content="11111111-1111-4111-8111-111111111111"'));
  assert(strFromU8(files['assets/app.js'])==='app');
  assert(strFromU8(files['_redirects'])==='/* /index.html 200\n');
});
Deno.test('rejects HTML injection in the store binding and external deployment origins',()=>{
  let failures=0;
  try { siteBundle(new Uint8Array(), '\"><script>'); } catch {failures++;}
  try { netlifyOrigin('evil.com/path'); } catch {failures++;}
  assert(failures===2);
  assert(netlifyOrigin('kiosku-test')==='https://kiosku-test.netlify.app');
});
