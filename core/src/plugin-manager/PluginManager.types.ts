import { RegistryNode } from "../registry/registry.types";

export interface AssetNode extends RegistryNode {
    asset: {
        destPath: string; // destination path for the asset
    }
}

/**
 * Unary async function type.
 */
export type GardenerPluginHoc<I = any, O = any, C = any> = (config: C) => GardenerPluginInstance<I, O>;

export type GardenerPluginInstance<I = any, O = any> = (input: I) => Promise<O>;