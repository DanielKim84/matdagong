import { useEffect, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import type { RegisterDraftForm } from "../../services/registerDraft";
import {
  VISIT_CONDITION_GROUPS,
  isVisitCondition,
  type Place,
  type Taster,
  type VisitCondition,
} from "../../models/place";
import { filterTagsForFocus, groupsForFocus } from "../../models/tasteTags";
import { initialFoodKind, type FoodKind } from "./recordModel";

/**
 * 장소 분야(음식점·카페, 가게 분류와 내 분야로 정함), 취향 태그, 매장 이용 정보 고르기입니다. 지금 사전·목록에 없는 이름은 처음부터 뺍니다.
 */
export function useRecordTaste({
  draft,
  editPlace,
  editRecord,
  placeCategory,
}: {
  draft?: RegisterDraftForm;
  editPlace?: Place;
  editRecord?: Taster;
  /** 1단계에서 고른 카카오 가게의 분류. 분야(음식점·카페)를 이 분류로 정합니다(보드 11-03은 분야 고르기를 두지 않음). */
  placeCategory?: string;
}) {
  const app = useAppData();
  const { tasteTags } = app;
  const foodKind: FoodKind =
    placeCategory || editPlace
      ? initialFoodKind(placeCategory ?? editPlace?.category, app.myProfile?.tasterFocus ?? "BOTH")
      : (draft?.foodKind ?? initialFoodKind(undefined, app.myProfile?.tasterFocus ?? "BOTH"));
  // 보관해 둔 입력·수정할 기록에 지금 분야·사전에 없는 태그 이름이 있으면 고른 태그에서 뺍니다.
  // 새로고침 직후처럼 태그 사전을 아직 못 받았으면 거를 기준이 없으므로 그대로 둡니다(거르면 수정하는 기록의 태그가 모두 사라짐).
  const [tags, setTags] = useState<string[]>(() => {
    const saved = draft ? draft.tags : (editRecord?.tags ?? []);
    return tasteTags.length ? filterTagsForFocus(saved, foodKind, tasteTags) : saved;
  });
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>(() =>
    (draft ? draft.visitConditions : (editRecord?.visitConditions ?? [])).filter(isVisitCondition),
  );

  const visibleTasteTags = tasteTags.filter((item) => groupsForFocus(foodKind).includes(item.tagGroup));
  // 가게를 바꿔 분야가 달라지면 보이지 않게 된 분류의 태그는 고른 목록에서도 뺍니다. 처음 그릴 때(태그 사전을 아직 못 받았을 수 있음)는
  // 건드리지 않아야 수정하는 기록의 태그가 사라지지 않습니다.
  const previousFoodKind = useRef(foodKind);
  useEffect(() => {
    if (previousFoodKind.current === foodKind) return;
    previousFoodKind.current = foodKind;
    setTags((current) => filterTagsForFocus(current, foodKind, tasteTags));
  }, [foodKind]);

  function toggleVisitCondition(condition: VisitCondition) {
    const group = VISIT_CONDITION_GROUPS.find((item) => item.conditions.includes(condition));
    setVisitConditions((current) => {
      if (current.includes(condition)) return current.filter((item) => item !== condition);
      const withoutSiblingChoice = group?.isExclusive
        ? current.filter((item) => !group.conditions.includes(item))
        : current;
      return [...withoutSiblingChoice, condition];
    });
  }

  return { foodKind, tags, setTags, visibleTasteTags, visitConditions, toggleVisitCondition };
}
