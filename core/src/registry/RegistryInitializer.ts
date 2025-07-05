import fs from "fs";
import path from "path";
import { RegistryNode } from "./registry.types";

/**
 * This file parses all contents and assets in the source directory and generates a registry of all files.
 */
export class RegistryInitializer {
    private registry: { content: RegistryNode; assets: RegistryNode } | null = null;

    constructor(
        private config: {
            contentDir: string;
            assetsDir: string;
        }
    ) {}

    /**
     * walks through the content and assets directories and collects all the files, getting easily-available metadata
     * as it goes.
     */
    async initializeRegistry(): Promise<void> {
        // build a tree for content and assets dirs
        this.registry = {
            content: this.buildTree(this.config.contentDir, this.config.contentDir),
            assets: this.buildTree(this.config.assetsDir, this.config.assetsDir)
        };
    }

    /**
     * Recursively builds a RegistryNode for given path
     */
    private buildTree(fullPath: string, rootDir?: string): RegistryNode {
        // detect symlink and refuse
        const lstat = fs.lstatSync(fullPath);
        if (lstat.isSymbolicLink()) {
            throw new Error("Symlinks are not supported");
        }
        const stats = fs.statSync(fullPath);
        // Always use the original rootDir for relPath
        const baseRoot = rootDir || fullPath;
        // relPath should always be root-relative, including the root dir name
        const relPath = path.relative(path.dirname(baseRoot), fullPath);
        const node: RegistryNode = {
            file: {
                name: path.basename(fullPath),
                path: fullPath,
                dirPath: path.dirname(fullPath),
                isDirectory: stats.isDirectory(),
                relPath,
                children: []
            }
        };
        if (stats.isDirectory()) {
            const entries = fs.readdirSync(fullPath);
            node.file.children = entries.map(name => this.buildTree(path.join(fullPath, name), baseRoot));
        } else {
            delete node.file.children;
        }
        return node;
    }
    /**
     * Returns the generated registry nodes
     */
    public getRegistry(): { content: RegistryNode; assets: RegistryNode } {
        if (!this.registry) throw new Error("Registry not generated yet");
        return this.registry;
    }
}