import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const errors = [];
const snakeCase = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const globalStyles = new Set(['shared/styles/tokens.css', 'shared/styles/reset.css']);
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (directory.startsWith('web/src') && !snakeCase.test(entry.name)) {
        errors.push(`${file}: 前端目录必须使用 lower_snake_case`);
      }
      files.push(...(await walk(file)));
    } else files.push(file);
  }
  return files;
}
async function exactPath(file) {
  const parts = path.relative(process.cwd(), path.resolve(file)).split(path.sep);
  let parent = process.cwd();
  for (const part of parts) {
    if (!(await readdir(parent)).includes(part)) return false;
    parent = path.join(parent, part);
  }
  return true;
}
for (const file of await walk('web/src')) {
  const text = await readFile(file, 'utf8');
  if (file.endsWith('.css')) {
    if (!file.endsWith('.module.css') && !globalStyles.has(path.relative('web/src', file))) {
      errors.push(`${file}: 组件样式必须使用 CSS Modules`);
    }
    if (file.endsWith('.module.css') && /:global\b/.test(text))
      errors.push(`${file}: 不要绕过组件样式隔离`);
  }
  if (/\.(tsx?|css)$/.test(file) && text.split('\n').length > 300)
    errors.push(`${file}: 超过 300 行，请按职责继续拆分`);
  if (!/\.tsx?$/.test(file)) continue;
  for (const [, specifier] of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
    const target = specifier.startsWith('@/')
      ? specifier.slice(2)
      : path.relative('web/src', path.resolve(path.dirname(file), specifier));
    const layer = path.relative('web/src', file).split(path.sep)[0];
    if (
      (layer === 'shared' && /^(app|features|scene)\//.test(target)) ||
      (layer === 'scene' && /^(app|features)\//.test(target)) ||
      (layer === 'features' && target.startsWith('app/'))
    ) {
      errors.push(`${file}: 不允许向上依赖 ${specifier}`);
    }
    const base = path.join('web/src', target.split('?')[0]);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.tsx')];
    let exact = false;
    for (const candidate of candidates) {
      try {
        if (await exactPath(candidate)) {
          exact = true;
          break;
        }
      } catch {
        /* Try the next extension. */
      }
    }
    if (!exact) errors.push(`${file}: 导入路径不存在或大小写不匹配 ${specifier}`);
  }
}
for (const file of await walk('internal')) {
  if (!file.endsWith('.go') || file.endsWith('_test.go')) continue;
  const text = await readFile(file, 'utf8');
  if (text.split('\n').length > 300) errors.push(`${file}: 超过 300 行，请按职责继续拆分`);
  const layer = path.relative('internal', file).split(path.sep)[0];
  const importBlock =
    text.match(/\bimport\s*\(([\s\S]*?)\)/)?.[1] || text.match(/\bimport\s+("[^"]+")/)?.[1] || '';
  const imports = [...importBlock.matchAll(/"([\w./-]+)"/g)].map((match) => match[1]);
  const forbidden = {
    content:
      /^(database\/sql|net\/http|github.com\/gin-gonic|nightwatch\/internal\/(game|session|storage|transport))/,
    game: /^(database\/sql|net\/http|github.com\/gin-gonic|nightwatch\/internal\/(session|storage|transport))/,
    session:
      /^(database\/sql|net\/http|github.com\/gin-gonic|nightwatch\/internal\/(storage|transport))/,
    storage: /^(github.com\/gin-gonic|nightwatch\/internal\/transport)/,
    transport: /^nightwatch\/internal\/storage/,
  }[layer];
  for (const specifier of imports)
    if (forbidden?.test(specifier)) errors.push(`${file}: 分层依赖错误 ${specifier}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('架构检查通过：目录命名、CSS Modules、导入大小写、文件规模及前后端分层。');
