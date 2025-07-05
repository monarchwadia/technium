import { GardenerPluginManager } from "./plugin-manager/PluginManager";
import { GardenerConfig } from "./config/config.types";
import { ConfigProvider } from "./config/ConfigProvider";
import { RegistryInitializer } from "./registry/RegistryInitializer";
import { defaultAssetPlugins } from "./default-plugins/defaultAssetPlugins";
import { defaultContentPlugins } from "./default-plugins/defaultContentPlugins";

export class Gardener {
    private config: GardenerConfig;
    
    constructor(
        config?: GardenerConfig
    ) {
        this.config = new ConfigProvider(config).provide();
    }

    async publish(): Promise<void> {
        const registryInitializer = new RegistryInitializer({
            contentDir: this.config.src.contentDir,
            assetsDir: this.config.src.assetsDir
        });

        await registryInitializer.initializeRegistry();
        const registry = registryInitializer.getRegistry();

        const assetManager = new GardenerPluginManager(
            defaultAssetPlugins(
                this.config.src.assetsDir,
                this.config.dist
            )
        )
        
        await assetManager.process(registry.assets);

        const contentManager = new GardenerPluginManager(
            defaultContentPlugins(
                this.config.src.contentDir,
                this.config.dist
            )
        );
        await contentManager.process(registry.content);
    }
}