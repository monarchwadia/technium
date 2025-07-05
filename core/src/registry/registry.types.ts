export interface RegistryNode {
    file: {
        name: string;
        path: string;
        dirPath: string;
        isDirectory: boolean;
        relPath: string; // relative path from the root of the source directory
        children?: RegistryNode[];
    }
}