import {readFile, writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {places} from './src/places.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [markup, style, common, license, geo, terrain, chapel, extras, roofColors, bundle] = await Promise.all([
  read('src/shell.html'),
  read('src/style.css'),
  read('src/standalone.css'),
  read('node_modules/three/LICENSE'),
  read('docs/data/campus-geo.json').then(JSON.parse),
  read('data/terrain.json').then(JSON.parse),
  read('data/luce-chapel.json').then(JSON.parse),
  read('data/campus-extras.json').then(JSON.parse),
  read('data/roof-colors.json').then(JSON.parse),
  build({entryPoints: ['src/app.js'], bundle: true, minify: true, write: false, legalComments: 'none'}),
]);
const data = gzipSync(JSON.stringify({geo,terrain,chapel,extras,roofColors}), {level: 9}).toString('base64');
const script = bundle.outputFiles[0].text.replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="以互動 3D 地圖遊覽臺中東海大學兩個教學區與 ${places.length} 處地標。">
  <title>東海大學 3D 校園</title>
  <style>${common}</style>
</head>
<body>
<main>
${markup}
<style>${style}</style>
<!--
${license}-->
<script type="application/octet-stream" id="thu-campus-data">${data}</script>
<script>${script}</script>
</main>
</body>
</html>
`;
await writeFile(new URL('docs/index.html', import.meta.url),html);
