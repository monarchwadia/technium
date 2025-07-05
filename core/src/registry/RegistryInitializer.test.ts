import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { RegistryInitializer } from "./RegistryInitializer";
import type { RegistryNode } from "./registry.types";

describe("RegistryInitializer", () => {
  let tmpRoot: string;
  let contentDir: string;
  let assetsDir: string;

  beforeAll(() => {
    // create a temporary structure
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "regtest-"));
    contentDir = path.join(tmpRoot, "content");
    assetsDir = path.join(tmpRoot, "assets");

    // set up content directory
    fs.mkdirSync(path.join(contentDir, "subdir"), { recursive: true });
    fs.writeFileSync(path.join(contentDir, "file1.txt"), "hello");
    fs.writeFileSync(path.join(contentDir, "subdir", "file2.md"), "world");

    // set up assets directory
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "img.png"), "");
  });

  afterAll(() => {
    // clean up
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("should generate correct registry tree for content and assets", async () => {
    const initializer = new RegistryInitializer({ contentDir, assetsDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();

    // content tree
    expect(Object.keys(registry)).toHaveLength(2);
    const { content, assets } = registry;
    expect(content.file.name).toBe(path.basename(contentDir));
    expect(content.file.isDirectory).toBe(true);
    const contentChildren = content.file.children!;
    expect(contentChildren.some(c => c.file.name === "file1.txt" && !c.file.isDirectory)).toBe(true);
    const subdirNode = contentChildren.find(c => c.file.name === "subdir");
    expect(subdirNode).toBeDefined();
    expect(subdirNode!.file.isDirectory).toBe(true);
    expect(subdirNode!.file.children).toEqual([
      expect.objectContaining({ file: expect.objectContaining({ name: "file2.md", isDirectory: false }) })
    ]);

    // assets tree
    expect(assets.file.name).toBe(path.basename(assetsDir));
    expect(assets.file.isDirectory).toBe(true);
    const assetsChildren = assets.file.children!;
    expect(assetsChildren).toEqual([
      expect.objectContaining({ file: expect.objectContaining({ name: "img.png", isDirectory: false }) })
    ]);
  });

  it("should throw when encountering a symlink in content directory", async () => {
    // create a symlink inside contentDir
    const targetDir = path.join(tmpRoot, "link-target");
    fs.mkdirSync(targetDir, { recursive: true });
    const symlinkPath = path.join(contentDir, "badlink");
    fs.symlinkSync(targetDir, symlinkPath, 'dir');
    const initializer = new RegistryInitializer({ contentDir, assetsDir });
    await expect(initializer.initializeRegistry()).rejects.toThrow("Symlinks are not supported");
  });

  describe("relPath", () => {
    let tmpRoot: string;
    let contentDir: string;
    let assetsDir: string;

    beforeEach(() => {
      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "regtest-"));
      contentDir = path.join(tmpRoot, "content");
      assetsDir = path.join(tmpRoot, "assets");
      fs.mkdirSync(contentDir, { recursive: true });
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(contentDir, "foo.md"), "foo", "utf-8");
      fs.mkdirSync(path.join(contentDir, "sub"), { recursive: true });
      fs.writeFileSync(path.join(contentDir, "sub", "bar.md"), "bar", "utf-8");
    });

    afterEach(() => {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it("should set relPath correctly for root and children", async () => {
      const reg = new RegistryInitializer({ contentDir, assetsDir });
      await reg.initializeRegistry();
      const { content } = reg.getRegistry();
      expect(content.file.relPath).toBe(path.basename(contentDir));
      const foo = content.file.children!.find(f => f.file.name === "foo.md");
      expect(foo?.file.relPath).toBe(path.join(path.basename(contentDir), "foo.md"));
      const sub = content.file.children!.find(f => f.file.name === "sub");
      expect(sub?.file.relPath).toBe(path.join(path.basename(contentDir), "sub"));
      const bar = sub?.file.children!.find(f => f.file.name === "bar.md");
      expect(bar?.file.relPath).toBe(path.join(path.basename(contentDir), "sub", "bar.md"));
    });
  });
});
