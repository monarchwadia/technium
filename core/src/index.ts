export { Gardener } from "./Gardener";
import { composePlugins } from "./plugin-manager/PluginManager.utils";
import { defaultAssetPlugins } from "./default-plugins/defaultAssetPlugins";
import { copyAssets, deleteFolder, mapToAssetNode } from "./default-plugins/defaultAssetPlugins";

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