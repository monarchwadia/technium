import type {RegistryNode, GardenerPluginHoc, GardenerPluginInstance} from "@technium/gardener-core";

/**
 * Composes a tuple of AsyncFn into a pipeline, inferring input of first and output of last.
 */
export function composePlugins<
  Fns extends [GardenerPluginInstance<any, any>, ...GardenerPluginInstance<any, any>[]]
>(
  ...fns: Fns
): GardenerPluginInstance<
  Parameters<Fns[0]>[0],
  // Infer return type of last function
  Fns extends [...any, GardenerPluginInstance<any, infer R>] ? R : never
> {
  return async (input) => {
    let result: any = input;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

export type VisitorFn = (node: RegistryNode, parent?: RegistryNode) => boolean | void | Promise<boolean | void>;

/**
 * Recursively visits each RegistryNode in the tree asynchronously.
 * If visitor returns false, stops recursing into that node's children.
 */
export async function visitNode(
  node: RegistryNode,
  visitor: VisitorFn,
  parent?: RegistryNode
): Promise<void> {
  const result = await visitor(node, parent);
  if (result === false) return;
  if (node.file.isDirectory && node.file.children) {
    for (const child of node.file.children) {
      await visitNode(child, visitor, node);
    }
  }
}

/**
 * Deeply maps a RegistryNode tree asynchronously, returning a new tree.
 * The mapper receives each node copy and can be async.
 */
export async function mapNode<T extends RegistryNode>(
  node: RegistryNode,
  mapper: (node: RegistryNode) => T | Promise<T>
): Promise<T> {
  // first map children if any
  let newChildren: RegistryNode[] | undefined;
  if (node.file.isDirectory && node.file.children) {
    const children = await Promise.all(
      node.file.children.map(child => mapNode(child, mapper))
    );
    newChildren = children;
  }
  // clone this node
  const cloned: RegistryNode = {
    file: {
      ...node.file,
      children: newChildren
    }
  };
  // apply mapper
  return await mapper(cloned);
}

/**
 * Recursively visits the registry object (both content and assets trees) asynchronously.
 */
export async function visitRegistry(
  registry: { content: RegistryNode; assets: RegistryNode },
  visitor: VisitorFn
): Promise<void> {
  await visitNode(registry.content, visitor);
  await visitNode(registry.assets, visitor);
}

