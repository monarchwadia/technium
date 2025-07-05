import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RegistryInitializer } from "../registry/RegistryInitializer";
import { GardenerPluginManager } from "../plugin-manager/PluginManager";
import { processMarkdown, processHtml, processDirectories, defaultContentPlugins } from "./defaultContentPlugins";

let tmpRoot: string;
let contentDir: string;
let outputDir: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "content-test-"));
  contentDir = path.join(tmpRoot, "content");
  outputDir = path.join(tmpRoot, "dist");
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  // Create test files
  fs.writeFileSync(path.join(contentDir, "markdown-test.md"), "---\ntitle: Test\n---\n# Hello World\n", "utf-8");
  fs.writeFileSync(path.join(contentDir, "html-test.html"), "<h1>HTML</h1>", "utf-8");
  fs.mkdirSync(path.join(contentDir, "subdir"), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("defaultContentPlugins with PluginManager", () => {
  it("processMarkdown converts .md to .html", async () => {
    const initializer = new RegistryInitializer({ contentDir, assetsDir: contentDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();
    const manager = new GardenerPluginManager(processMarkdown(contentDir, outputDir));
    await manager.process(registry.content);
    const htmlPath = path.join(outputDir, "markdown-test.html");
    expect(fs.existsSync(htmlPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, "utf-8");
    expect(html).toContain("Hello World");
  });

  it("processHtml copies .html files", async () => {
    const initializer = new RegistryInitializer({ contentDir, assetsDir: contentDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();
    const manager = new GardenerPluginManager(processHtml(contentDir, outputDir));
    await manager.process(registry.content);
    const htmlPath = path.join(outputDir, "html-test.html");
    expect(fs.existsSync(htmlPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, "utf-8");
    expect(html).toContain("<h1>HTML</h1>");
  });

  it("processDirectories creates directories", async () => {
    const initializer = new RegistryInitializer({ contentDir, assetsDir: contentDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();
    const manager = new GardenerPluginManager(processDirectories(contentDir, outputDir));
    await manager.process(registry.content);
    const dirPath = path.join(outputDir, "subdir");
    expect(fs.existsSync(dirPath)).toBe(true);
    expect(fs.statSync(dirPath).isDirectory()).toBe(true);
  });

  it("defaultContentPlugins runs all plugins in order", async () => {
    const initializer = new RegistryInitializer({ contentDir, assetsDir: contentDir });
    await initializer.initializeRegistry();
    const registry = initializer.getRegistry();
    const manager = new GardenerPluginManager(defaultContentPlugins(contentDir, outputDir));
    await manager.process(registry.content);
    expect(fs.existsSync(path.join(outputDir, "markdown-test.html"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "html-test.html"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "subdir"))).toBe(true);
  });
});
