/** 현재 페이지를 가운데에 두고 최대 maxVisible개(기본 5개)의 페이지 번호(0부터)를 돌려줍니다. */
export function visiblePageIndices(activeIndex: number, total: number, maxVisible = 5): number[] {
  const count = Math.min(Math.max(0, total), maxVisible);
  if (!count) return [];
  const start = Math.max(0, Math.min(activeIndex - Math.floor(count / 2), total - count));
  return Array.from({ length: count }, (_, offset) => start + offset);
}
