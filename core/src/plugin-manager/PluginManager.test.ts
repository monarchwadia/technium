import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RegistryInitializer } from '../registry/RegistryInitializer';
import { GardenerPluginManager } from './PluginManager';
import type { AssetNode } from './PluginManager.types';
import { defaultAssetPlugins } from '../default-plugins/defaultAssetPlugins';

let tmpRoot: string;
let contentDir: string;
let assetsDir: string;
let destDir: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-test-'));
  contentDir = path.join(tmpRoot, 'content');
  assetsDir = path.join(tmpRoot, 'assets');
  destDir = path.join(tmpRoot, 'dist');
  // create directories
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(destDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('AssetManager', () => {
  it('simple scenario: copies single file at root', async () => {
    // create one asset file
    const filePath = path.join(assetsDir, 'pic.png');
    fs.writeFileSync(filePath, 'data');

    const initializer = new RegistryInitializer({ contentDir, assetsDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();

    const manager = new GardenerPluginManager(defaultAssetPlugins(assetsDir, destDir));
    const tree = await manager.process(registry.assets) as AssetNode;

    // check returned tree: root node destPath
    expect(tree.asset.destPath).toBe(path.join(destDir));
    // child file destPath
    const child = (tree.file.children![0] as AssetNode);
    expect(child.asset.destPath).toBe(path.join(destDir, 'pic.png'));
    expect(tree.file.name).toBe(path.basename(assetsDir));

    // check file copied
    const copied = fs.readFileSync(child.asset.destPath, 'utf-8');
    expect(copied).toBe('data');
  });

  it('complex scenario: nested dirs and multiple files', async () => {
    // nested structure
    fs.mkdirSync(path.join(assetsDir, 'images/2025'), { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'readme.txt'), 'hello');
    fs.writeFileSync(path.join(assetsDir, 'images', 'logo.svg'), '<svg>');
    fs.writeFileSync(path.join(assetsDir, 'images', '2025', 'new.png'), 'pngdata');

    const initializer = new RegistryInitializer({ contentDir, assetsDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();

    const manager = new GardenerPluginManager(defaultAssetPlugins(assetsDir, destDir));
    const tree = await manager.process(registry.assets) as AssetNode;

    // traverse returned AssetNode tree to collect destPaths
    const collected: string[] = [];
    function collect(node: AssetNode) {
      collected.push(node.asset.destPath);
      if (node.file.isDirectory && node.file.children) {
        node.file.children.forEach(child => collect(child as AssetNode));
      }
    }
    collect(tree);

    // expected destPaths include all
    const expected = [
      path.join(destDir),
      path.join(destDir, 'readme.txt'),
      path.join(destDir, 'images'),
      path.join(destDir, 'images', 'logo.svg'),
      path.join(destDir, 'images', '2025'),
      path.join(destDir, 'images', '2025', 'new.png')
    ];
    expect(new Set(collected)).toEqual(new Set(expected));

    // check files exist
    expected.forEach(p => {
      const stats = fs.statSync(p);
      expect(stats.isFile() || stats.isDirectory()).toBe(true);
    });
  });
});
