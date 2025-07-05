import fs from "fs";
import path from "path";
import { visitNode } from "../registry/registryUtils";
import type { RegistryNode } from "../registry/registry.types";
import type { GardenerPlugin } from "../plugin-manager/PluginManager.types";
import { composePlugins } from "../plugin-manager/PluginManager.utils";

import grayMatter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import Handlebars from "handlebars";
import crypto from "crypto";
import { visit } from "unist-util-visit";
import mermaid from "mermaid";
import { execSync } from "child_process";
import os from "os";

/**
 * Finds the nearest _layout.html file up the directory tree, starting from the given directory.
 * Returns the path to the layout file, or null if not found.
 */
function findNearestLayout(startDir: string, rootDir: string): string | null {
  let dir = startDir;
  while (true) {
    const layoutPath = path.join(dir, "_layout.html");
    if (fs.existsSync(layoutPath)) return layoutPath;
    if (path.resolve(dir) === path.resolve(rootDir)) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Converts WikiNames (e.g., CamelCase words) to links if a corresponding .md file exists in the content tree.
 */
function wikifyLinks(html: string, root: RegistryNode, contentDir: string, currentNode?: RegistryNode): string {
  const wikiNameRegex = /\b([A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*)\b/g;
  // Map from WikiName to RegistryNode
  const wikiPages = new Map<string, RegistryNode>();
  function collectPages(n: RegistryNode) {
    if (!n.file.isDirectory && n.file.name.endsWith('.md')) {
      const name = n.file.name.replace(/\.md$/, '');
      wikiPages.set(name, n);
    }
    if (n.file.children) {
      n.file.children.forEach(collectPages);
    }
  }
  collectPages(root);
  // Get relPath of current file (without extension)
  let currentRelDir = '';
  if (currentNode) {
    currentRelDir = path.dirname(currentNode.file.relPath);
  }
  return html.replace(wikiNameRegex, (match) => {
    if (wikiPages.has(match)) {
      const targetNode = wikiPages.get(match)!;
      // Compute relative path from current file to target .html
      let targetRel = targetNode.file.relPath.replace(/\.md$/, '.html');
      let href = targetRel;
      if (currentRelDir && currentRelDir !== '.') {
        href = path.relative(currentRelDir, targetRel);
      }
      // Always use POSIX-style slashes for href
      href = '/' + href.split(path.sep).join('/');
      return `<a href=\"${href}\" class=\"wikiname\" >${match}</a>`;
    }
    // For missing, still provide the would-be path
    let missingHref = match + '.html';
    if (currentRelDir && currentRelDir !== '.') {
      missingHref = path.relative(currentRelDir, missingHref);
      missingHref = missingHref.split(path.sep).join('/');
    }
    return `<a href=\"${missingHref}\" class=\"wikiname wikiname-missing\" >${match}</a>`;
  });
}

/**
 * Plugin: processes markdown files, converting them to HTML and applying a Handlebars layout if present.
 * Adds Mermaid diagram support: code blocks with ```mermaid are rendered to SVG and replaced with <img> tags.
 */
export const processMarkdown = (
  contentDir: string,
  outputDir: string
): GardenerPlugin<RegistryNode, RegistryNode> =>
  async (root) => {
    await visitNode(root, async (node) => {
      const rel = path.relative(contentDir, node.file.path);
      const dest = path.join(
        outputDir,
        rel.replace(/\.md$/, ".html")
      );
      if (!node.file.isDirectory && node.file.name.endsWith(".md")) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const raw = fs.readFileSync(node.file.path, "utf-8");
        const { content, data } = grayMatter(raw);
        // Collect Mermaid diagrams
        const mermaidDiagrams: Record<string, string> = {};
        const file = await unified()
          .use(remarkParse)
          .use(remarkFrontmatter)
          .use(() => (tree) => {
            visit(tree, "code", (node: any, idx: number, parent: any) => {
              if (node.lang === "mermaid" && parent) {
                const hash = crypto.createHash("md5").update(node.value).digest("hex");
                const img = `mermaid-${hash}.svg`;
                mermaidDiagrams[img] = node.value;
                parent.children[idx] = {
                  type: "image",
                  url: `/generated/mermaid/${img}`,
                  title: "Mermaid diagram",
                  alt: "Mermaid diagram",
                  data: { hProperties: { style: "min-width:100%;height:auto;" } },
                };
              }
            });
          })
          .use(remarkGfm)
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeStringify)
          .process(content);
        let html = String(file);
        // Add WikiName links
        html = wikifyLinks(html, root, contentDir, node);
        // Find the nearest _layout.html up the directory tree
        const nearestLayout = findNearestLayout(path.dirname(node.file.path), contentDir);
        if (nearestLayout) {
          const layoutSrc = fs.readFileSync(nearestLayout, "utf-8");
          const template = Handlebars.compile(layoutSrc);
          html = template({ content: html, ...data });
        }
        fs.writeFileSync(dest, html, "utf-8");
        // Write Mermaid SVGs using npx mmdc
        const mermaidDir = path.join(outputDir, "generated", "mermaid");
        fs.mkdirSync(mermaidDir, { recursive: true });
        
        // Check if Chrome/Chromium is available
        let chromeExecutable = null;
        const possibleChromePaths = [
          'google-chrome',
          'chromium-browser', 
          'chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ];
        
        for (const chromePath of possibleChromePaths) {
          try {
            execSync(`which ${chromePath}`, { stdio: 'ignore' });
            chromeExecutable = chromePath;
            break;
          } catch {
            // Try next path
          }
        }
        
        // Write puppeteer-config.json to a temp dir
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gardener-mmdc-"));
        const puppeteerConfigPath = path.join(tmpDir, "puppeteer-config.json");
        const puppeteerConfig = { 
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          ...(chromeExecutable && { executablePath: chromeExecutable })
        };
        fs.writeFileSync(puppeteerConfigPath, JSON.stringify(puppeteerConfig), "utf-8");
        for (const [img, code] of Object.entries(mermaidDiagrams)) {
          const mmdPath = path.join(mermaidDir, img.replace(/\.svg$/, ".mmd"));
          const svgPath = path.join(mermaidDir, img);
          fs.writeFileSync(mmdPath, code, "utf-8");
          try {
            execSync(`npx mmdc -i "${mmdPath}" -o "${svgPath}" -p "${puppeteerConfigPath}"`, { stdio: "inherit" });
            // rm the .mmd file after rendering
            fs.rmSync(mmdPath);
          } catch (e) {
            console.error(`Failed to render Mermaid diagram ${img} with mmdc:`, e);
            if (!chromeExecutable) {
              console.error(`
Chrome/Chromium not found. To fix this:
- Ubuntu/Debian: sudo apt install chromium-browser
- CentOS/RHEL: sudo yum install chromium
- macOS: brew install chromium
- Or install Google Chrome manually
              `);
            }
          }
        }
      }
    });
    return root;
  };

/**
 * Plugin: copies HTML files to the output directory, applying Handlebars templating if frontmatter is present.
 * If the HTML file contains frontmatter, it is parsed and the file is treated as a Handlebars template with frontmatter variables.
 * Also applies the nearest _layout.html as a Handlebars template, just like markdown.
 */
export const processHtml = (
  contentDir: string,
  outputDir: string
): GardenerPlugin<RegistryNode, RegistryNode> =>
  async (root) => {
    await visitNode(root, async (node) => {
      const rel = path.relative(contentDir, node.file.path);
      const dest = path.join(outputDir, rel);
      if (!node.file.isDirectory && node.file.name.endsWith(".html") && node.file.name !== "_layout.html") {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const raw = fs.readFileSync(node.file.path, "utf-8");
        // Try to parse frontmatter
        const { content, data } = grayMatter(raw);
        let html: string;
        if (Object.keys(data).length > 0) {
          // Treat as Handlebars template
          const template = Handlebars.compile(content);
          html = template(data);
        } else {
          html = raw;
        }
        // Find the nearest _layout.html up the directory tree
        const nearestLayout = findNearestLayout(path.dirname(node.file.path), contentDir);
        if (nearestLayout) {
          const layoutSrc = fs.readFileSync(nearestLayout, "utf-8");
          const layoutTemplate = Handlebars.compile(layoutSrc);
          html = layoutTemplate({ content: html, ...data });
        }
        fs.writeFileSync(dest, html, "utf-8");
      }
    });
    return root;
  };

/**
 * Plugin: creates directories in the output tree.
 */
export const processDirectories = (
  contentDir: string,
  outputDir: string
): GardenerPlugin<RegistryNode, RegistryNode> =>
  async (root) => {
    await visitNode(root, async (node) => {
      const rel = path.relative(contentDir, node.file.path);
      const dest = path.join(outputDir, rel);
      if (node.file.isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
      }
    });
    return root;
  };

/**
 * Default pipeline for content: process directories, markdown, and HTML files.
 */
export const defaultContentPlugins = (
  contentDir: string,
  outputDir: string
): GardenerPlugin<RegistryNode, RegistryNode> =>
  composePlugins(
    processDirectories(contentDir, outputDir),
    processMarkdown(contentDir, outputDir),
    processHtml(contentDir, outputDir)
  );