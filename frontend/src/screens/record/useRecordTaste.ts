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
import { groupsForFocus } from "../../models/tasteTags";
import { initialFoodKind, type FoodKind } from "./recordModel";

/** 장소 분야(음식점·카페), 취향 태그, 방문 조건 고르기입니다. */
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
  const [tags, setTags] = useState<string[]>(() => (draft ? draft.tags : (editRecord?.tags ?? [])));
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>(() =>
    draft ? draft.visitConditions.filter(isVisitCondition) : (editRecord?.visitConditions ?? []),
  );

  const visibleTasteTags = tasteTags.filter(
    (item) => groupsForFocus(foodKind).includes(item.tagGroup) && item.tagGroup !== "VISIT",
  );

  function chooseFoodKind(next: FoodKind) {
    setFoodKind(next);
    const visibleGroups = groupsForFocus(next);
    // 분야를 바꾸면 화면에서 숨겨지는 그룹의 태그는 등록 데이터에서도 제외합니다.
    setTags((current) =>
      current.filter((tagName) =>
        tasteTags.some((item) => item.name === tagName && visibleGroups.includes(item.tagGroup)),
      ),
    );
  }

  function toggleVisitCondition(condition: VisitCondition) {
    const group = VISIT_CONDITION_GROUPS.find((item) => item.conditions.includes(condition));
    setVisitConditions((current) => {
      if (current.includes(condition)) return current.filter((item) => item !== condition);
      const withoutSiblingChoice = group?.exclusive
        ? current.filter((item) => !group.conditions.includes(item))
        : current;
      return [...withoutSiblingChoice, condition];
    });
  }

  return { foodKind, chooseFoodKind, tags, setTags, visibleTasteTags, visitConditions, toggleVisitCondition };
}
