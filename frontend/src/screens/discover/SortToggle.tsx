import { useAppData } from "../../app/AppData";
import { Segmented } from "../../components/ui";
import type { SortOrder } from "./discoverModel";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "priority", label: "추천순" },
  { value: "distance", label: "가까운 순" },
];

/**
 * 지도 목록의 정렬 두 칸(추천순 · 가까운 순, 보드 06-02의 꽉 찬 알약 탭)입니다. 발견과 내 지도가 함께 씁니다.
 * 두 정렬을 나란히 보여 줘 지금 어떤 순서인지, 눌러서 무엇으로 바뀌는지 바로 알 수 있게 합니다.
 * 내 위치를 모르면 가까운 순 대신 위치를 켜 달라는 안내를 띄웁니다.
 */
export default function SortToggle({
  sort,
  canSortByDistance,
  onSortChange,
}: {
  sort: SortOrder;
  canSortByDistance: boolean;
  onSortChange: (sort: SortOrder) => void;
}) {
  const { actions } = useAppData();

  function choose(next: SortOrder) {
    if (next === "distance" && !canSortByDistance) {
      actions.notify({
        kind: "info",
        title: "내 위치가 필요해요",
        message: "지도 오른쪽 아래의 ‘내 위치’를 켜면 가까운 순으로 볼 수 있어요.",
      });
      return;
    }
    onSortChange(next);
  }

  return <Segmented<SortOrder> label="목록 정렬" value={sort} options={SORT_OPTIONS} onChange={choose} />;
}
