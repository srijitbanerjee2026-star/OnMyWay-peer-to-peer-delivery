export const OUTER_CLUSTER: readonly string[] = ['M', 'N', 'P', 'Q', 'R', 'S', 'T'];
export const CORE_CLUSTER: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L'];
export const ALL_BLOCKS: readonly string[] = [...CORE_CLUSTER, ...OUTER_CLUSTER];

export function getPrioritizedBlocks(homeBlock: string): string[] {
  const normalized = homeBlock.trim().toUpperCase();
  const isCore = CORE_CLUSTER.includes(normalized);
  const isOuter = OUTER_CLUSTER.includes(normalized);

  if (!isCore && !isOuter) {
    return [normalized, ...CORE_CLUSTER, ...OUTER_CLUSTER];
  }

  const primaryCluster = isCore ? CORE_CLUSTER : OUTER_CLUSTER;
  const fallbackCluster = isCore ? OUTER_CLUSTER : CORE_CLUSTER;
  const adjacentBlocks = primaryCluster.filter((b) => b !== normalized);

  return [normalized, ...adjacentBlocks, ...fallbackCluster];
}
