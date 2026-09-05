import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { loadEnv } from 'vite';
const frontend = loadEnv('production', process.cwd(), 'VITE_');
const server = Object.fromEntries((await readFile('supabase/.env.local','utf8')).split(/\r?\n/).filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
if (!server.NETLIFY_AUTH_TOKEN || !server.NETLIFY_TEAM_SLUG || frontend.VITE_DATA_MODE!=='supabase') throw new Error('Konfigurasi Netlify/Supabase belum lengkap.');
const ref = new URL(frontend.VITE_SUPABASE_URL).hostname.split('.')[0];
let name = `kiosku-app-${ref}`;
const team = server.NETLIFY_TEAM_SLUG;
async function request(path, init={}) {
  const response = await fetch(`https://api.netlify.com/api/v1${path}`,{...init,headers:{Authorization:`Bearer ${server.NETLIFY_AUTH_TOKEN}`,...init.headers},signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw Object.assign(new Error(`Netlify HTTP ${response.status}`),{status:response.status});
  return response.json();
}
let site;
let savedTarget;
try { savedTarget=JSON.parse(await readFile('docs/deployment/netlify-main.json','utf8')); } catch(e) { if(e.code!=='ENOENT')throw e; }
// Track the existing project by immutable ID, including after a dashboard rename.
if(savedTarget?.siteId) {
  site=await request(`/sites/${encodeURIComponent(savedTarget.siteId)}`);
  if(site.account_slug!==team)throw new Error('Target Netlify tidak cocok.');
  name=site.name;
} else {
  try { site=await request(`/sites/${name}.netlify.app`); } catch(e) { if(e.status!==404)throw e; }
}
if (!site) site=await request(`/${encodeURIComponent(team)}/sites`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,force_ssl:true,built_with_badge_enabled:false})});
if (site.name!==name || site.account_slug!==team) throw new Error('Target Netlify tidak cocok.');
const files={};
async function collect(prefix='') {
  for(const entry of await readdir(`dist/${prefix}`,{withFileTypes:true})) {
    if(entry.isDirectory()) await collect(`${prefix}${entry.name}/`);
    else files[prefix+entry.name]=new Uint8Array(await readFile(`dist/${prefix}${entry.name}`));
  }
}
await collect();
files['storefront.zip']=new Uint8Array(await readFile('.artifacts/storefront.zip'));
files['_redirects']=new TextEncoder().encode('/* /index.html 200\n');
files['_headers']=new TextEncoder().encode('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  X-Frame-Options: SAMEORIGIN\n/storefront.zip\n  Cache-Control: public, max-age=0, must-revalidate\n');
const deploy=await request(`/sites/${site.id}/deploys?title=Kiosku%20main%20and%20storefront%20bundle`,{method:'POST',headers:{'Content-Type':'application/zip'},body:zipSync(files,{level:6})});
const result={siteId:site.id,siteName:name,url:`https://${name}.netlify.app`,deployId:deploy.id,state:deploy.state,team};
await mkdir('docs/deployment',{recursive:true});
await writeFile('docs/deployment/netlify-main.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
