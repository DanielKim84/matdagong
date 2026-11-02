import { useState } from "react";
import Icon from "../../components/Icon";
import type { NewPlace } from "../../models/place";
import { HEADLINE_MAX, REASON_MAX } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

const VISIBILITY_OPTIONS: { value: NewPlace["visibility"]; title: string; text: string }[] = [
  { value: "public", title: "공개 추천", text: "다른 맛객의 발견과 피드에 보여요." },
  { value: "private", title: "나만 보기", text: "내 기록에서만 볼 수 있어요." },
];

/** 4단계 · 한 줄 추천·자세한 이야기와 공개 범위 */
export default function StoryStep({ form }: { form: RecordForm }) {
  const [isDetailOpen, setIsDetailOpen] = useState(() => !!form.detail);
  const detailMax = Math.max(0, REASON_MAX - 1 - form.headline.trim().length);
  return (
    <section className="r-record-step" aria-label="추천 이유와 공개 범위">
      <RecordStepTitle>한 줄로 추천한다면?</RecordStepTitle>

      <label className="r-card r-record-headline">
        <span className="visually-hidden">한 줄 추천</span>
        <textarea
          className="r-display"
          rows={2}
          value={form.headline}
          maxLength={HEADLINE_MAX}
          placeholder="예: 홍합이 반, 국물이 반. 공깃밥은 꼭 두 개."
          onChange={(event) => form.setHeadline(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setIsDetailOpen(true);
            }
          }}
        />
        <small>
          {form.headline.length} / {HEADLINE_MAX}
        </small>
      </label>

      {isDetailOpen ? (
        <label className="r-record-detail">
          <span>
            자세한 이야기 <small>선택</small>
          </span>
          <textarea
            rows={5}
            value={form.detail}
            maxLength={Math.max(detailMax, form.detail.length)}
            autoFocus={!form.detail}
            placeholder="메뉴 맛, 분위기, 다시 간다면 꼭 할 것처럼 직접 느낀 이야기를 남겨 주세요."
            onChange={(event) => form.setDetail(event.target.value)}
          />
          <small>
            {form.reason.length} / {REASON_MAX}
          </small>
        </label>
      ) : (
        <button type="button" className="r-record-dashed" onClick={() => setIsDetailOpen(true)}>
          <Icon name="plus" />
          자세한 이야기 더 쓰기 (선택)
        </button>
      )}

      <fieldset className="r-record-field r-record-visibility">
        <legend>
          <span className="r-record-field-head">
            <h2>공개 범위</h2>
          </span>
        </legend>
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`r-card r-record-option ${form.visibility === option.value ? "is-on" : ""}`}
          >
            <input
              className="visually-hidden"
              type="radio"
              name="record-visibility"
              checked={form.visibility === option.value}
              onChange={() => form.setVisibility(option.value)}
            />
            <span className="r-record-option__copy">
              <b>{option.title}</b>
              <small>{option.text}</small>
            </span>
            <span className="r-record-option__mark" aria-hidden="true">
              <Icon name="check" />
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
