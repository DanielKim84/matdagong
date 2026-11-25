import TasteTagPicker from "../../components/TasteTagPicker";
import { VISIT_CONDITION_GROUPS } from "../../models/place";
import { groupsForFocus } from "../../models/tasteTags";
import { MAX_VISIT_CONDITIONS } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

/** 매장 이용 칩은 묶음 없이 한 줄로 늘어놓습니다(보드 11-03). 주차·영업 시간·응대 경험은 안에서 하나만 고릅니다(useRecordTaste). */
const VISIT_CONDITIONS = VISIT_CONDITION_GROUPS.flatMap((group) => group.conditions);

/**
 * 3단계 · 태그와 이용 정보(보드 11-03, 모두 선택 입력): 장소 분야(음식점·카페, 가게 분류로 정함)의 분류마다 "음식 종류 2 / 10" 제목과
 * # 칩을 펼치고(TasteTagPicker inline), 맨 아래 "매장 이용 1 / 5" 칩입니다. 분류 사이는 가는 선으로 나눕니다.
 */
export default function TasteStep({ form }: { form: RecordForm }) {
  const visitCount = form.visitConditions.length;
  const isVisitFull = visitCount >= MAX_VISIT_CONDITIONS;
  return (
    <section className="r-record-step" aria-label="취향 태그와 매장 이용 정보">
      <RecordStepTitle lead="맛과 상황, 매장 정보를 선택해 주세요.">3 · 태그와 이용 정보</RecordStepTitle>

      {form.visibleTasteTags.length ? (
        <TasteTagPicker
          options={form.visibleTasteTags}
          value={form.tags}
          onChange={form.setTags}
          groups={groupsForFocus(form.foodKind)}
          inline
          hasHash
        />
      ) : (
        <p className="r-record-help" role="status">
          이 분야에서 고를 수 있는 태그가 아직 없어요. 태그 없이도 기록할 수 있어요.
        </p>
      )}

      <section className="r-record-visit" aria-label="매장 이용">
        <h3 className="r-taste-picker__inline-title">
          매장 이용
          <span>
            <em>{visitCount}</em> / {MAX_VISIT_CONDITIONS}
          </span>
        </h3>
        <div className="r-chips r-chips--wrap">
          {VISIT_CONDITIONS.map((condition) => {
            const isOn = form.visitConditions.includes(condition);
            return (
              <button
                type="button"
                key={condition}
                className={`r-chip r-taste-picker__chip ${isOn ? "is-on" : ""}`}
                aria-pressed={isOn}
                disabled={!isOn && isVisitFull}
                onClick={() => form.toggleVisitCondition(condition)}
              >
                #{condition}
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}
