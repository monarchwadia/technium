import { RegistryNode } from "../registry/registry.types";
import type { GardenerPlugin } from "./PluginManager.types";

export class GardenerPluginManager {
    plugins: GardenerPlugin[];
    
    constructor(...plugins: GardenerPlugin[]) {
        this.plugins = plugins;
    }

    /**
     * Runs the plugin chain over the given RegistryNode, returning the final AssetNode tree.
     */
    public async process(root: RegistryNode): Promise<RegistryNode> {
        let result: any = root;
        for (const plugin of this.plugins) {
            result = await plugin(result);
        }
        return result as RegistryNode;
    }
}