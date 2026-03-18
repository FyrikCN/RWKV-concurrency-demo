import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const inputPath = path.join(distDir, 'index.html');
const outputPath = path.resolve('rwkv-concurrency-demo.single.html');

function isLocalAsset(ref) {
  return !/^(?:[a-z]+:)?\/\//i.test(ref) && !ref.startsWith('data:');
}

function resolveAssetPath(ref) {
  const normalized = ref.replace(/^\.\//, '').replace(/^\//, '');
  return path.resolve(distDir, normalized);
}

function escapeTagContent(content, tagName) {
  const pattern = new RegExp(`</${tagName}>`, 'gi');
  return content.replace(pattern, `<\\/${tagName}>`);
}

async function replaceAsync(source, regex, replacer) {
  const matches = [];
  source.replace(regex, (...args) => {
    matches.push(replacer(...args));
    return args[0];
  });

  const replacements = await Promise.all(matches);
  let index = 0;
  return source.replace(regex, () => replacements[index++]);
}

let html = await readFile(inputPath, 'utf8');

html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/gi, '');

html = await replaceAsync(
  html,
  /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
  async (match, href) => {
    if (!isLocalAsset(href)) {
      return match;
    }

    const css = await readFile(resolveAssetPath(href), 'utf8');
    return `<style>\n${escapeTagContent(css, 'style')}\n</style>`;
  },
);

html = await replaceAsync(
  html,
  /<script\b([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi,
  async (match, before, src) => {
    if (!isLocalAsset(src)) {
      return match;
    }

    const js = await readFile(resolveAssetPath(src), 'utf8');
    return `<script type="module">\n${escapeTagContent(js, 'script')}\n</script>`;
  },
);

await writeFile(outputPath, html);
console.log(`Wrote single-file HTML: ${path.relative(process.cwd(), outputPath)}`);
