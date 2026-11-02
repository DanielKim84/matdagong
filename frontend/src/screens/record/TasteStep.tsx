import Icon from "../../components/Icon";
import TasteTagPicker from "../../components/TasteTagPicker";
import { Segmented, SectionHead } from "../../components/ui";
import { VISIT_CONDITION_GROUPS } from "../../models/place";
import { groupsForFocus } from "../../models/tasteTags";
import type { FoodKind } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

const FOOD_KIND_OPTIONS: { value: FoodKind; label: string }[] = [
  { value: "RESTAURANT", label: "음식점" },
  { value: "CAFE_DESSERT", label: "카페·디저트" },
];

/** 3단계 · 취향 태그와 방문 조건(모두 선택 입력) */
export default function TasteStep({
  form,
  onRequest,
}: {
  form: RecordForm;
  onRequest: (type: "TAG" | "PLACE_INFO") => void;
}) {
  return (
    <section className="r-record-step" aria-label="취향 태그와 방문 조건">
      <RecordStepTitle lead="모두 선택 입력이에요. 고른 태그는 취향이 맞는 사람에게 추천할 때 쓰여요.">
        어떤 곳이었나요?
      </RecordStepTitle>

      <Segmented<FoodKind>
        label="장소 분야"
        value={form.foodKind}
        onChange={form.chooseFoodKind}
        options={FOOD_KIND_OPTIONS}
      />

      <div className="r-record-field">
        <SectionHead
          className="r-record-field-head"
          title="이럴 때 좋아요"
          meta={form.tags.length ? `${form.tags.length}개 선택` : "선택"}
        />
        {form.visibleTasteTags.length ? (
          <div className="r-record-tags">
            <TasteTagPicker
              options={form.visibleTasteTags}
              value={form.tags}
              onChange={form.setTags}
              groupsToShow={groupsForFocus(form.foodKind).filter((group) => group !== "VISIT")}
            />
          </div>
        ) : (
          <p className="r-record-help" role="status">
            이 분야에서 고를 수 있는 태그가 아직 없어요. 태그 없이도 기록할 수 있어요.
          </p>
        )}
        <button type="button" className="r-text-button" onClick={() => onRequest("TAG")}>
          찾는 태그가 없나요? 태그 제안하기
        </button>
      </div>

      <div className="r-record-field">
        <SectionHead className="r-record-field-head" title="방문 조건" meta="직접 확인한 것만" />
        {VISIT_CONDITION_GROUPS.map((group) => (
          <div className="r-record-condition" key={group.title} role="group" aria-label={group.title}>
            <span className="r-record-condition__title">
              {group.title}
              <small>{group.exclusive ? "하나만" : "여러 개"}</small>
            </span>
            <div className="r-chips r-chips--wrap">
              {group.conditions.map((condition) => {
                const isOn = form.visitConditions.includes(condition);
                return (
                  <button
                    type="button"
                    key={condition}
                    className={`r-chip ${isOn ? "is-on" : ""}`}
                    aria-pressed={isOn}
                    onClick={() => form.toggleVisitCondition(condition)}
                  >
                    {isOn && <Icon name="check" />}
                    {condition}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button type="button" className="r-text-button" onClick={() => onRequest("PLACE_INFO")}>
          필요한 정보가 없나요? 정보 제안하기
        </button>
      </div>
    </section>
  );
}
