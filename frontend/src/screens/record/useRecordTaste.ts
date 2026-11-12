import { useState } from "react";
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

/** 장소 분야(음식점·카페), 취향 태그, 매장 이용 정보 고르기입니다. 지금 사전·목록에 없는 이름은 처음부터 뺍니다. */
export function useRecordTaste({
  draft,
  editPlace,
  editRecord,
}: {
  draft?: RegisterDraftForm;
  editPlace?: Place;
  editRecord?: Taster;
}) {
  const app = useAppData();
  const { tasteTags } = app;
  const [foodKind, setFoodKind] = useState<FoodKind>(() =>
    draft ? draft.foodKind : initialFoodKind(editPlace?.category, app.myProfile?.tasterFocus ?? "BOTH"),
  );
  // 보관해 둔 입력·수정할 기록에 지금 분야·사전에 없는 태그 이름이 있으면 고른 태그에서 뺍니다.
  const [tags, setTags] = useState<string[]>(() =>
    filterTagsForFocus(draft ? draft.tags : (editRecord?.tags ?? []), foodKind, tasteTags),
  );
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>(() =>
    (draft ? draft.visitConditions : (editRecord?.visitConditions ?? [])).filter(isVisitCondition),
  );

  const visibleTasteTags = tasteTags.filter((item) => groupsForFocus(foodKind).includes(item.tagGroup));

  function chooseFoodKind(next: FoodKind) {
    setFoodKind(next);
    // 분야를 바꾸면 화면에서 숨겨지는 분류의 태그는 등록 데이터에서도 제외합니다.
    setTags((current) => filterTagsForFocus(current, next, tasteTags));
  }

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

  return { foodKind, chooseFoodKind, tags, setTags, visibleTasteTags, visitConditions, toggleVisitCondition };
}
