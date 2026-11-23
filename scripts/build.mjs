import {build} from 'esbuild';
import {cp,mkdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/host.ts'],bundle:true,platform:'node',format:'esm',target:'node24',external:['@deepseek-ai/*'],outfile:'dist/host.js'});
await build({entryPoints:['src/editor.ts'],bundle:true,target:'es2022',outfile:'dist/editor.js'});
await cp('src/client.js','dist/client.js');
