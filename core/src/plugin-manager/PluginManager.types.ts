import { RegistryNode } from "../registry/registry.types";

export interface AssetNode extends RegistryNode {
    asset: {
        destPath: string; // destination path for the asset
    }
}

/**
 * Unary async function type.
 */
export type GardenerPlugin<I = any, O = any> = (input: I) => Promise<O>;