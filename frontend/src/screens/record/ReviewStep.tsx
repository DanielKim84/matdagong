import Icon from "../../components/Icon";
import type { RecordStep } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

/** 5단계 · 저장 전 확인. 항목마다 해당 단계로 돌아가 고칠 수 있습니다. */
export default function ReviewStep({ form, onEdit }: { form: RecordForm; onEdit: (step: RecordStep) => void }) {
  const menuNames = form.menus.map((item) => item.name.trim()).filter(Boolean);
  const headline = form.headline.trim() || form.reason.split("\n")[0];
  const rows: { step: RecordStep; label: string; value: string }[] = [
    ...(form.steps.includes("place")
      ? [{ step: "place" as const, label: "장소", value: form.name || "선택 안 함" }]
      : []),
    { step: "media", label: "사진", value: `${form.photos.length}장` },
    { step: "media", label: "추천 메뉴", value: menuNames.length ? menuNames.join(", ") : "없음" },
    { step: "taste", label: "태그", value: form.tags.length ? form.tags.join(", ") : "없음" },
    {
      step: "taste",
      label: "방문 조건",
      value: form.visitConditions.length ? form.visitConditions.join(", ") : "없음",
    },
    { step: "story", label: "공개 범위", value: form.visibility === "public" ? "공개 추천" : "나만 보기" },
  ];
  return (
    <section className="r-record-step" aria-label="기록 확인">
      <RecordStepTitle lead="저장하기 전에 한 번 더 확인해 주세요.">
        {form.isEditing ? "이대로 고칠까요?" : "이대로 남길까요?"}
      </RecordStepTitle>

      <article className="r-card r-record-preview">
        {form.photos[0] ? (
          <img src={form.photos[0]} alt={`${form.name} 대표 사진`} />
        ) : (
          <span className="r-record-preview__empty">
            <Icon name="image" />
          </span>
        )}
        <div>
          <b>{form.name}</b>
          {headline && <span className="r-display">&ldquo;{headline}&rdquo;</span>}
          {form.detail.trim() && form.headline.trim() && <p>{form.detail.trim()}</p>}
          {form.tags.length > 0 && (
            <div className="r-tags">
              {form.tags.slice(0, 4).map((tag) => (
                <span className="r-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      <div className="r-record-summary">
        {rows.map((row) => (
          <div className="r-record-summary__row" key={row.label}>
            <span>{row.label}</span>
            <b>{row.value}</b>
            <button
              type="button"
              className="r-text-button"
              aria-label={`${row.label} 수정`}
              onClick={() => onEdit(row.step)}
            >
              수정
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
