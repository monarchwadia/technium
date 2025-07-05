import { describe, it, expect } from 'vitest';
import type { RegistryNode } from './registry.types';
import { visitNode, mapNode, visitRegistry } from './registryUtils';

describe('registryUtils', () => {
  // Helper to build a small tree: root -> [a, b -> [c]]
  const makeTree = (): RegistryNode => ({
    file: {
      name: 'root',
      path: '/root',
      dirPath: '/',
      isDirectory: true,
      children: [
        { file: { name: 'a', path: '/root/a', dirPath: '/root', isDirectory: false } },
        {
          file: {
            name: 'b',
            path: '/root/b',
            dirPath: '/root',
            isDirectory: true,
            children: [
              { file: { name: 'c', path: '/root/b/c', dirPath: '/root/b', isDirectory: false } }
            ]
          }
        }
      ]
    }
  });

  it('visitNode walks the tree in depth-first order', async () => {
    const names: string[] = [];
    const tree = makeTree();
    await visitNode(tree, (node) => { names.push(node.file.name); });
    expect(names).toEqual(['root', 'a', 'b', 'c']);
  });

  it('visitNode stops recursion when visitor returns false', async () => {
    const names: string[] = [];
    const tree = makeTree();
    await visitNode(tree, (node) => { names.push(node.file.name); if (node.file.name === 'b') return false; });
    // should not include 'c'
    expect(names).toEqual(['root', 'a', 'b']);
  });

  it('mapNode produces a new tree without mutating the original', async () => {
    const tree = makeTree();
    const mapped = await mapNode(tree, (node) => ({
      file: { ...node.file, name: node.file.name.toUpperCase() }
    }));

    // original names unchanged
    expect(tree.file.name).toBe('root');
    expect(tree.file.children![1].file.name).toBe('b');
    // mapped names uppercased
    expect(mapped.file.name).toBe('ROOT');
    const mappedNames: string[] = [];
    await visitNode(mapped, (node) => { mappedNames.push(node.file.name); });
    expect(mappedNames).toEqual(['ROOT', 'A', 'B', 'C']);
  });

  it('visitRegistry visits both content and asset trees asynchronously', async () => {
    const tree1 = makeTree();
    const tree2: RegistryNode = { file: { name: 'X', path: '/X', dirPath: '/', isDirectory: false } };
    const registry = { content: tree1, assets: tree2 };
    const visited: string[] = [];
    await visitRegistry(registry, (node) => { visited.push(node.file.name); });
    expect(visited).toEqual(['root', 'a', 'b', 'c', 'X']);
  });
});
