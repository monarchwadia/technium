import type { GardenerPlugin } from "./PluginManager.types";

/**
 * Composes a tuple of AsyncFn into a pipeline, inferring input of first and output of last.
 */
export function composePlugins<
  Fns extends [GardenerPlugin<any, any>, ...GardenerPlugin<any, any>[]]
>(
  ...fns: Fns
): GardenerPlugin<
  Parameters<Fns[0]>[0],
  // Infer return type of last function
  Fns extends [...any, GardenerPlugin<any, infer R>] ? R : never
> {
  return async (input) => {
    let result: any = input;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}
