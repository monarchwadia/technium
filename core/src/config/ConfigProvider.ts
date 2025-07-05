import path from "path";
import { GardenerConfig } from "./config.types";

export class ConfigProvider {
    private config: GardenerConfig;

    constructor(userProvidedConfig?: GardenerConfig) {
        this.config = {
            src: {
                assetsDir: path.join(process.cwd(), "assets"),
                contentDir: path.join(process.cwd(), "content")
            },
            dist: path.join(process.cwd(), "dist")
        };

        // merge user provided config with defaults

        if (!userProvidedConfig) {
            return;
        }
        
        if (userProvidedConfig.dist) {
            this.config.dist = this.ensureAbsolutePath(userProvidedConfig.dist);
        }
        if (userProvidedConfig.src) {
            if (userProvidedConfig.src.contentDir) {
                this.config.src.contentDir = this.ensureAbsolutePath(userProvidedConfig.src.contentDir);
            }
            if (userProvidedConfig.src.assetsDir) {
                this.config.src.assetsDir = this.ensureAbsolutePath(userProvidedConfig.src.assetsDir);
            }
        }
    }

    provide(): GardenerConfig {
        return this.config;
    }

    private ensureAbsolutePath(text: string): string {
        if (!path.isAbsolute(text)) {
            throw new Error(`Expected absolute path, but got: ${text}`);
        }
        return text;
    }
}
