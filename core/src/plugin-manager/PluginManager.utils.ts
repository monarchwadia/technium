import type { GardenerPluginHoc, GardenerPluginInstance } from "./PluginManager.types";

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
