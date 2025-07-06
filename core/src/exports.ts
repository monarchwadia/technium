export { Gardener } from "./Gardener";
import { composePlugins } from "./plugin-manager/PluginManager.utils";
import { defaultAssetPlugins } from "./default-plugins/defaultAssetPlugins";
import { copyAssets, deleteFolder, mapToAssetNode } from "./default-plugins/defaultAssetPlugins";
export type { RegistryNode } from "./registry/registry.types";
export type { GardenerPluginHoc, GardenerPluginInstance } from "./plugin-manager/PluginManager.types";

export const Plugins = {
    Asset: {
        mapToAssetNode,
        copyAssets,
        defaultPlugins: defaultAssetPlugins,
    },
    Content: {
        
    },
    General: {
        deleteFolder,
    },
    Utils: {
        composePlugins,
    }
}
