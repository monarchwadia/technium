import path from "path";
import { RegistryNode } from "../registry/registry.types";
import { mapNode, visitNode } from "../registry/registryUtils";
import { AssetNode, type GardenerPluginHoc } from "../plugin-manager/PluginManager.types";
import fs from "fs";
import { composePlugins } from "../plugin-manager/PluginManager.utils";

/**
 * Static plugin: maps a RegistryNode tree to AssetNode tree using provided dirs.
 */
type MapToAssetNodeConfig = {
  assetsDir: string; // directory where assets are located
  destDir: string; // destination directory for assets
}
export const mapToAssetNode: GardenerPluginHoc<RegistryNode, AssetNode, MapToAssetNodeConfig> = ({assetsDir, destDir}) =>
  async (root: RegistryNode): Promise<AssetNode> => {
    return mapNode<AssetNode>(root, (node: RegistryNode) => {
      const rel = path.relative(assetsDir, node.file.path);
      const destPath = path.join(destDir, rel);
      return { ...node, asset: { destPath } } as AssetNode;
    });
  };

/**
 * Static plugin: copies files/dirs according to AssetNode.destPath.
 */
export const copyAssets: GardenerPluginHoc<AssetNode, AssetNode, void> = () => async (tree: AssetNode): Promise<AssetNode> => {
  await visitNode(tree, (node: RegistryNode) => {
    const assetNode = node as AssetNode;
    const target = assetNode.asset.destPath;
    if (assetNode.file.isDirectory) {
      fs.mkdirSync(target, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(assetNode.file.path, target);
    }
  });
  return tree;
};

export const deleteFolder: GardenerPluginHoc<RegistryNode, RegistryNode, { dir: string }> = ({dir}) => {
  return async (root: RegistryNode): Promise<RegistryNode> => {
    // check if folder is outside of project root
    if (!path.isAbsolute(dir)) {
      throw new Error(`Path must be absolute: ${dir}`);
    }

    if (!dir.startsWith(process.cwd())) {
      throw new Error(`Path must be inside project root: ${dir}`);
    }
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return root;
  };
};

type DefaultAssetPluginConfig = {
  assetsDir: string; // directory where assets are located
  destDir: string; // destination directory for assets
}

export const defaultAssetPlugins: GardenerPluginHoc<RegistryNode, AssetNode, DefaultAssetPluginConfig> =
  ({ assetsDir, destDir }) => {
    return composePlugins(
      mapToAssetNode({ assetsDir, destDir }),
      copyAssets()
  );
}
