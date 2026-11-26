import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {chinesePlaces} from './src/places.js';
import {englishDescriptions} from './src/places-en.js';
import {shellText} from './src/i18n.js';

// Builds the Chinese page (docs/index.html) and the English page (docs/en/index.html)
// from the same source; each bundle is compiled with its own __LANG__.
const missing = chinesePlaces.filter(place => !englishDescriptions[place.id]).map(place => place.id);
const unknown = Object.keys(englishDescriptions).filter(id => !chinesePlaces.some(place => place.id === id));
if (missing.length || unknown.length) {
  throw new Error(`src/places-en.js: missing ${missing.join(', ') || 'none'}; unknown ${unknown.join(', ') || 'none'}`);
}

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const bundle = lang => build({entryPoints: ['src/app.js'], bundle: true, minify: true, write: false,
  legalComments: 'none', define: {__LANG__: JSON.stringify(lang)}});
const [markup, style, common, license, geo, terrain, chapel, extras, roofColors, bus, zhBundle, enBundle] = await Promise.all([
  read('src/shell.html'),
  read('src/style.css'),
  read('src/standalone.css'),
  read('node_modules/three/LICENSE'),
  read('docs/data/campus-geo.json').then(JSON.parse),
  read('data/terrain.json').then(JSON.parse),
  read('data/luce-chapel.json').then(JSON.parse),
  read('data/campus-extras.json').then(JSON.parse),
  read('data/roof-colors.json').then(JSON.parse),
  read('data/campus-bus.json').then(JSON.parse),
  bundle('zh'),
  bundle('en'),
]);
const data = gzipSync(JSON.stringify({geo,terrain,chapel,extras,roofColors,bus}), {level: 9}).toString('base64');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(lang, built) {
  const text = shellText[lang];
  const body = markup.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (typeof text[key] !== 'string') throw new Error(`src/shell.html: no ${lang} text for {{${key}}}`);
    return escape(text[key]);
  });
  const script = built.outputFiles[0].text.replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html lang="${text.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(text.metaDescription(chinesePlaces.length))}">
  <title>${escape(text.title)}</title>
  <link rel="alternate" hreflang="${text.otherLang}" href="${text.otherHref}">
  <style>${common}</style>
</head>
<body>
<main>
${body}
<style>${style}</style>
<!--
${license}-->
<script type="application/octet-stream" id="thu-campus-data">${data}</script>
<script>${script}</script>
</main>
</body>
</html>
`;
}

await mkdir(new URL('docs/en/', import.meta.url), {recursive: true});
await writeFile(new URL('docs/index.html', import.meta.url), page('zh', zhBundle));
await writeFile(new URL('docs/en/index.html', import.meta.url), page('en', enBundle));
