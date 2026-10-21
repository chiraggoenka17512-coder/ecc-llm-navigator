import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';

const CATALOG_PATH = path.resolve('catalog_items.json');
const OUTPUT_BIN = path.resolve('embeddings.bin');
const OUTPUT_JS = path.resolve('catalog_items.js');

async function main() {
  console.log('Loading catalog_items.json...');
  const items = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`Loaded ${items.length} items.`);

  console.log('Initializing Xenova/all-MiniLM-L6-v2 pipeline...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true
  });
  console.log('Pipeline ready.');

  const dimension = 384;
  const buffer = new Float32Array(items.length * dimension);

  console.log(`Generating embeddings for ${items.length} items in batches...`);
  const batchSize = 32;
  const startTime = Date.now();

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const texts = chunk.map(item => {
      // Build a dense semantic representation
      const typeLabel = item.type.toUpperCase();
      const cat = item.category || '';
      const name = item.name.replace(/[-_/]/g, ' ');
      const desc = item.description || '';
      const summary = item.summary || '';
      const tags = (item.tags || []).join(' ');
      return `${typeLabel}: ${name} (${cat}). ${desc}. ${summary}. Tags: ${tags}`.slice(0, 512);
    });

    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    // output is a Tensor of shape [batchSize, 384]
    const data = output.data; // Float32Array

    for (let j = 0; j < chunk.length; j++) {
      const offset = (i + j) * dimension;
      const subOffset = j * dimension;
      for (let k = 0; k < dimension; k++) {
        buffer[offset + k] = data[subOffset + k];
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const progress = Math.min(i + batchSize, items.length);
    process.stdout.write(`\rProgress: ${progress}/${items.length} (${Math.round(progress / items.length * 100)}%) - ${elapsed}s`);
  }

  console.log('\nWriting embeddings.bin...');
  fs.writeFileSync(OUTPUT_BIN, Buffer.from(buffer.buffer));
  console.log(`Saved ${OUTPUT_BIN} (${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB)`);

  console.log('Writing catalog_items.js...');
  const jsContent = `// Auto-generated catalog for ECC & Skills Semantic Navigator\nwindow.CATALOG_ITEMS = ${JSON.stringify(items)};\n`;
  fs.writeFileSync(OUTPUT_JS, jsContent);
  console.log(`Saved ${OUTPUT_JS}`);

  console.log('Finished successfully!');
}

main().catch(err => {
  console.error('Error during embedding generation:', err);
  process.exit(1);
});
