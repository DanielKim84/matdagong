import type { NewPlace } from "../../models/place";
import { HEADLINE_MAX, REASON_MAX } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

const VISIBILITY_OPTIONS: { value: NewPlace["visibility"]; title: string; text: string }[] = [
  { value: "public", title: "공개", text: "모든 맛다공 사용자가 볼 수 있어요." },
  { value: "private", title: "나만 보기", text: "나만 보고 관리할 수 있는 개인 기록이에요." },
];

/**
 * 4단계 · 추천 이유와 공개(보드 11-04): "한 줄 추천 문장 N / 60" 입력, "자세한 이야기"(칸 안 오른쪽 아래 글자 수),
 * "공개 범위" 고르기 줄(공개 / 나만 보기, 왼쪽 동그라미, 고르면 연한 코랄)입니다.
 */
export default function StoryStep({ form }: { form: RecordForm }) {
  // 저장할 때 "한 줄 추천 + 줄바꿈(1자) + 자세한 이야기"를 한 필드로 합치므로, 합친 길이가 REASON_MAX를 넘지 않게 남은 만큼만 받습니다.
  const detailMax = Math.max(0, REASON_MAX - 1 - form.headline.trim().length);
  return (
    <section className="r-record-step" aria-label="추천 이유와 공개 범위">
      <RecordStepTitle lead="이곳을 추천하는 이유를 남기고, 공개 범위를 선택해 주세요.">
        4 · 추천 이유와 공개
      </RecordStepTitle>

      <label className="r-record-story-field">
        <span className="r-record-story-field__head">
          <b>한 줄 추천 문장</b>
          <small>
            {form.headline.length} / {HEADLINE_MAX}
          </small>
        </span>
        <input
          value={form.headline}
          maxLength={HEADLINE_MAX}
          placeholder="예: 반찬까지 정갈해서 또 가고 싶은 곳이에요."
          onChange={(event) => form.setHeadline(event.target.value)}
        />
      </label>

      <label className="r-record-story-field">
        <span className="r-record-story-field__head">
          <b>자세한 이야기</b>
        </span>
        <span className="r-record-story-field__area">
          <textarea
            rows={5}
            value={form.detail}
            maxLength={Math.max(detailMax, form.detail.length)}
            placeholder="메뉴 맛, 분위기, 다시 간다면 꼭 할 것처럼 직접 느낀 이야기를 남겨 주세요."
            onChange={(event) => form.setDetail(event.target.value)}
          />
          <small>
            {form.reason.length} / {REASON_MAX}
          </small>
        </span>
      </label>

      <fieldset className="r-record-visibility">
        <legend>공개 범위</legend>
        <div className="r-options" role="radiogroup" aria-label="공개 범위">
          {VISIBILITY_OPTIONS.map((option) => {
            const isOn = form.visibility === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isOn}
                className={`r-option r-option--stacked ${isOn ? "is-on" : ""}`}
                onClick={() => form.setVisibility(option.value)}
              >
                <span className="r-option__radio" aria-hidden="true" />
                <span className="r-option__copy">
                  <b>{option.title}</b>
                  <small>{option.text}</small>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
