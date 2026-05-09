#!/usr/bin/env node
/**
 * Warmup script for Tesseract.js
 * Pre-downloads language files to speed up first OCR request
 */

import { createWorker } from 'tesseract.js';
import { tmpdir } from 'os';
import { join } from 'path';

const LANGS = ['ara', 'eng'];

console.log('🔥 Warming up Tesseract.js...\n');

async function warmupLanguage(lang) {
  console.log(`📥 Downloading ${lang} language data...`);
  const startTime = Date.now();
  
  try {
    const worker = await createWorker(lang, 1, {
      cachePath: join(tmpdir(), 'tess-data'),
      logger: (m) => {
        if (m.progress === 1) {
          console.log(`   ✅ ${lang}: ${m.status}`);
        } else if (m.progress > 0 && m.progress % 0.2 < 0.01) {
          console.log(`   ⏳ ${lang}: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    await worker.terminate();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ ${lang} ready in ${elapsed}s\n`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to warmup ${lang}:`, error.message);
    return false;
  }
}

async function main() {
  const results = await Promise.all(LANGS.map(warmupLanguage));
  
  const allSuccess = results.every(r => r);
  
  if (allSuccess) {
    console.log('✅ All language data downloaded successfully!');
    console.log('🚀 First OCR request will now be much faster.\n');
  } else {
    console.log('⚠️  Some languages failed to download.');
    console.log('   OCR will still work but may be slower on first use.\n');
  }
}

main().catch(error => {
  console.error('❌ Warmup failed:', error);
  process.exit(1);
});
