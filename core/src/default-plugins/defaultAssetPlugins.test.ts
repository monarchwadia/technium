import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteFolder } from './defaultAssetPlugins';
import type { RegistryNode } from '../registry/registry.types';

describe('deleteFolder', () => {
  let tmpRoot: string;
  let oldCwd: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-test-'));
    oldCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(oldCwd);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('deletes existing directory and returns root', async () => {
    const dir = path.join(tmpRoot, 'toDelete');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'file.txt'), 'content');
    const root: RegistryNode = {} as any;

    const plugin = deleteFolder(dir);
    const result = await plugin(root);
    expect(fs.existsSync(dir)).toBe(false);
    expect(result).toBe(root);
  });

  it('throws if path is not absolute', async () => {
    const plugin = deleteFolder('relative/path');
    await expect(plugin({} as any)).rejects.toThrowError('Path must be absolute: relative/path');
  });

  it('throws if path is outside project root', async () => {
    const outsideDir = path.join(oldCwd, 'outside');
    fs.mkdirSync(outsideDir, { recursive: true });
    const plugin = deleteFolder(outsideDir);
    await expect(plugin({} as any)).rejects.toThrowError(`Path must be inside project root: ${outsideDir}`);
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  it('returns root if directory does not exist', async () => {
    const dir = path.join(tmpRoot, 'noexist');
    const root: RegistryNode = {} as any;
    const plugin = deleteFolder(dir);
    const result = await plugin(root);
    expect(fs.existsSync(dir)).toBe(false);
    expect(result).toBe(root);
  });
});
