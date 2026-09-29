'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
async function main(){
  const context=vm.createContext({Response,Request,File,FormData,TextDecoder,TextEncoder,URL,Headers,Uint8Array,DataView,crypto,console});
  vm.runInContext(fs.readFileSync(path.join(root,'src/quotes.js'),'utf8').replaceAll('export async function','async function'),context);
  const png=new File([Uint8Array.from([137,80,78,71,13,10,26,10,0])],'photo.png',{type:'image/png'});
  const stl=new File(['solid sample\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid sample'],'model.stl');
  assert.equal((await context.validateQuoteFile(png)).ext,'png');
  assert.equal((await context.validateQuoteFile(stl)).ext,'stl');
  for(const file of [new File(['<script>x</script>'],'x.png'),new File(['x'],'x.exe'),new File([new Uint8Array(5*1024*1024+1)],'x.stl')]) await assert.rejects(context.validateQuoteFile(file));
  let stored=false,deleted=false,inserted=false;
  const env={QUOTE_FILES:{put:async()=>{stored=true;},delete:async()=>{deleted=true;}},DB:{prepare:()=>({bind:()=>({run:async()=>{inserted=true;}})})}};
  const form=()=>{const f=new FormData();for(const [k,v] of Object.entries({name:'Test Person',email:'test@example.com',phone:'+905001112233',detail:'Test özel sipariş açıklaması',quantity:'2',privacy:'accepted',website:''}))f.set(k,v);f.set('file',stl);return f;};
  const request=f=>new Request('https://api.filementorstudio.net/api/quotes',{method:'POST',body:f});
  const result=await context.submitQuote(request(form()),env);assert.equal(result.ok,true);assert.ok(stored&&inserted);
  const invalid=form();invalid.set('quantity','0');await assert.rejects(context.submitQuote(request(invalid),env));
  const noConsent=form();noConsent.delete('privacy');await assert.rejects(context.submitQuote(request(noConsent),env));
  env.DB.prepare=()=>({bind:()=>({run:async()=>{throw Error('database unavailable');}})});
  await assert.rejects(context.submitQuote(request(form()),env));assert.equal(deleted,true);
  const worker=fs.readFileSync(path.join(root,'src/worker.js'),'utf8').replace(/^import .*;\r?\n/,'').replace('export default {','globalThis.worker = {');
  vm.runInContext(worker,context);
  const checkout={name:'Test',surname:'Person',email:'test@example.com',phone:'+905001112233',address:'Test address',district:'Alanya',city:'Antalya',zipCode:'07400',items:[{id:'abc',quantity:1}]};
  assert.ok(context.validateCheckout(checkout));assert.equal(context.validateCheckout(checkout,false),null);
  assert.ok(context.validateCheckout({...checkout,identityNumber:'invalid'},false));
  const authEnv={DB:{prepare:()=>({bind:()=>({run:async()=>({}),first:async()=>({count:1})})})}};
  for(const route of ['/api/admin/quotes','/api/admin/quotes/00000000-0000-0000-0000-000000000000/file']) {
    const response=await context.worker.fetch(new Request('https://api.filementorstudio.net'+route),authEnv);
    assert.equal(response.status,401,'Quote data must require admin authentication');
  }
  const blocked=await context.worker.fetch(new Request('https://api.filementorstudio.net/api/quotes',{method:'POST',headers:{Origin:'https://untrusted.example'}}),authEnv);
  assert.equal(blocked.status,403);
  const {buildSeo}=require('./seo-build.js');
  const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'filementor-seo-'));fs.mkdirSync(path.join(tmp,'data'));fs.mkdirSync(path.join(tmp,'dist/js'),{recursive:true});
  fs.writeFileSync(path.join(tmp,'data/catalog-export.json'),JSON.stringify({fetchedAt:'test',products:[{id:'test-id',name:'<script>alert(1)</script>',price:12,stock:1,status:'active',desc:'" test'}]}));
  buildSeo(tmp,path.join(tmp,'dist'));
  const page=fs.readFileSync(path.join(tmp,'dist/urunler/test-id.html'),'utf8');assert.ok(!page.includes('<script>alert'));assert.ok(page.includes('application/ld+json'));assert.ok(page.includes('\\u003cscript'));
  console.log('Sales checks passed: uploads, file limits, consent, persistence/cleanup, identity settings and SEO escaping.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
