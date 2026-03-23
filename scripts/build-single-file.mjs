import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const inputPath = path.join(distDir, 'index.html');
const outputPath = path.join(distDir, 'standalone.html');

function escapeInlineScript(source) {
  return source.replace(/<\/script/gi, '<\\/script');
}

function minifyInlineCss(source) {
  return source.replace(/\s+/g, ' ').trim();
}

async function inlineAssetReferences() {
  let html = await readFile(inputPath, 'utf8');

  const scriptTags = [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)];
  for (const match of scriptTags) {
    const [fullTag, src] = match;
    const assetPath = path.join(distDir, src);
    const js = await readFile(assetPath, 'utf8');
    const inlineTag = `<script type="module">\n${escapeInlineScript(js)}\n</script>`;
    html = html.replace(fullTag, () => inlineTag);
  }

  const stylesheetTags = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
  for (const match of stylesheetTags) {
    const [fullTag, href] = match;
    const assetPath = path.join(distDir, href);
    const css = await readFile(assetPath, 'utf8');
    const inlineTag = `<style>\n${minifyInlineCss(css)}\n</style>`;
    html = html.replace(fullTag, () => inlineTag);
  }

  await mkdir(distDir, {recursive: true});
  await writeFile(outputPath, html, 'utf8');
  console.log(`Created standalone HTML: ${path.relative(rootDir, outputPath)}`);
}

inlineAssetReferences().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
