import fs from 'fs';
import path from 'path';

const binPath = path.resolve('embeddings.bin');
const jsPath = path.resolve('embeddings_data.js');

if (fs.existsSync(binPath)) {
  const buf = fs.readFileSync(binPath);
  const base64 = buf.toString('base64');
  fs.writeFileSync(jsPath, `// Base64 encoded 384-dim Float32 vector embeddings for 987 catalog items
window.EMBEDDINGS_BASE64 = "${base64}";
`);
  console.log(`Generated ${jsPath} (${(fs.statSync(jsPath).size / (1024 * 1024)).toFixed(2)} MB)`);
} else {
  console.error("embeddings.bin not found");
}
