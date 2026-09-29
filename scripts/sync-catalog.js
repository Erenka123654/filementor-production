'use strict';
const fs=require('node:fs');const path=require('node:path');
(async()=>{
  const response=await fetch('https://api.filementorstudio.net/api/products',{signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error('Katalog alınamadı: '+response.status);
  const data=await response.json(); if(!Array.isArray(data.products)) throw new Error('Geçersiz ürün yanıtı.');
  fs.writeFileSync(path.join(__dirname,'../data/catalog-export.json'),JSON.stringify({fetchedAt:new Date().toISOString(),products:data.products},null,2));
  console.log(`${data.products.length} gerçek ürün kaydedildi.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
