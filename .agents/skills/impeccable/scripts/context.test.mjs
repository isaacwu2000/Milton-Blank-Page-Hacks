import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadContext } from './context.mjs';

const cli = fileURLToPath(new URL('./context.mjs', import.meta.url));

// Each fixture is a separate receiving repo, with no shared product identity.
function fixture(t, platform = 'web') {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'harness-design-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, '.agents/context'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents/context/PRODUCT.md'), `# Product\n\n## Platform\n\n${platform}\n\n## Product Purpose\n\nFixture app.\n`);
  fs.writeFileSync(path.join(root, '.agents/context/DESIGN.md'), '# Local design\n\nFixture-owned palette and interaction contract.\n');
  return root;
}

function boot(root) {
  const env = { ...process.env };
  delete env.IMPECCABLE_CONTEXT_DIR;
  delete env.OPENAI_API_KEY;
  const result = spawnSync(process.execPath, [cli], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('central helper resolves receiving repo context, not the skill checkout', t => {
  const root = fixture(t);
  const context = loadContext(root);
  assert.equal(context.projectRoot, root);
  assert.match(context.productPath, /\.agents\/context\/PRODUCT\.md$/);
  assert.match(context.design, /Fixture-owned palette/);
  assert.match(boot(root), /Fixture-owned palette/);
});

test('a second repository does not inherit another repository identity', t => {
  const first = fixture(t);
  const second = fixture(t);
  fs.writeFileSync(path.join(first, '.agents/context/DESIGN.md'), '# Design\n\nFIRST_REPO_ONLY\n');
  fs.writeFileSync(path.join(second, '.agents/context/DESIGN.md'), '# Design\n\nSECOND_REPO_ONLY\n');
  assert.match(boot(first), /FIRST_REPO_ONLY/);
  const output = boot(second);
  assert.match(output, /SECOND_REPO_ONLY/);
  assert.doesNotMatch(output, /FIRST_REPO_ONLY/);
});

test('native iOS boot includes the bundled native platform guidance', t => {
  const output = boot(fixture(t, 'ios'));
  assert.match(output, /NATIVE PLATFORM REFERENCE: IOS/);
  assert.match(output, /# iOS platform/);
  assert.doesNotMatch(output, /MANUAL_DETECTOR_REQUIRED/);
});


test('native Android boot includes its own platform guidance', t => {
  const output = boot(fixture(t, 'android'));
  assert.match(output, /NATIVE PLATFORM REFERENCE: ANDROID/);
  assert.match(output, /# Android platform/);
  assert.doesNotMatch(output, /# iOS platform/);
  assert.doesNotMatch(output, /MANUAL_DETECTOR_REQUIRED/);
});
