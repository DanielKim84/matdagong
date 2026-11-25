import Icon, { type IconName } from "../../components/Icon";
import { formatWon } from "../../utils/format";
import { REASON_MAX, recordPlaceMeta, summaryHeadline, type RecordStep } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

/** 사진 줄에 보여 줄 사진 수 */
const PREVIEW_PHOTO_LIMIT = 3;

/** 항목 카드 머리줄: 아이콘 · 이름 · 오른쪽 "수정 >" 알약 */
function CardHead({
  icon,
  title,
  onEdit,
  editLabel = "수정",
}: {
  icon: IconName;
  title: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="r-record-check__head">
      <Icon name={icon} />
      <b>{title}</b>
      {onEdit && (
        <button type="button" className="r-record-check__edit" onClick={onEdit} aria-label={`${title} ${editLabel}`}>
          {editLabel}
          {editLabel === "수정" && <Icon name="chevron" />}
        </button>
      )}
    </div>
  );
}

/**
 * 저장 전 확인(보드 12-01)과 내 기록 수정(보드 12-03)입니다. 항목마다 카드로 나누고 "수정 >"로 그 단계에 가서 고칩니다.
 * - 새 기록: 큰 제목 → 장소 카드(사진 · 이름 · "분류 · 동네") → 사진 N장 → 기록 이유 → 태그 → 저장하기.
 * - 수정: 회색 안내 "내가 작성한 기록만 수정할 수 있어요." → 장소 카드 → 사진(N장) "사진 변경" → 메뉴 줄 → 기록 이유(글자 수) → 태그 > → 수정 저장.
 */
export default function ReviewStep({ form, onEdit }: { form: RecordForm; onEdit: (step: RecordStep) => void }) {
  const headline = summaryHeadline(form.headline, form.reason);
  const meta = recordPlaceMeta(form.selectedPlace?.category_name, form.address);
  const menus = form.menus.filter((item) => item.name.trim());
  const tags = [...form.tags, ...form.visitConditions];
  const canEditPlace = form.steps.includes("place");

  const placeCard = (
    <div className="r-record-check r-record-check--place">
      {form.photos[0] ? (
        <img src={form.photos[0]} alt="" />
      ) : (
        <span className="r-record-check__empty" aria-hidden="true">
          <Icon name="fork" />
        </span>
      )}
      <span className="r-record-check__place">
        <b>{form.name}</b>
        {meta && <small>{meta}</small>}
      </span>
      {canEditPlace && (
        <button type="button" className="r-record-check__edit" onClick={() => onEdit("place")} aria-label="장소 수정">
          수정
          <Icon name="chevron" />
        </button>
      )}
    </div>
  );

  const tagChips = tags.length > 0 && (
    <div className="r-record-check__tags">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );

  if (form.isEditing) {
    return (
      <section className="r-record-step r-record-step--edit" aria-label="내 기록 수정">
        <p className="r-info-note">
          <Icon name="info" />
          내가 작성한 기록만 수정할 수 있어요.
        </p>
        {placeCard}

        <div className="r-record-edit-part">
          <CardHead
            icon="image"
            title={`사진 (${form.photos.length}장)`}
            onEdit={() => onEdit("media")}
            editLabel="사진 변경"
          />
          {form.photos.length > 0 && (
            <div className="r-record-check__photos is-wide">
              {form.photos.slice(0, PREVIEW_PHOTO_LIMIT).map((photo, index) => (
                <img key={`${photo.slice(-24)}-${index}`} src={photo} alt="" />
              ))}
            </div>
          )}
        </div>

        {menus.length > 0 && (
          <div className="r-record-edit-part">
            <b className="r-record-edit-part__title">메뉴</b>
            {menus.map((item, index) => (
              <button
                type="button"
                key={`${item.name}-${index}`}
                className="r-record-edit-menu"
                onClick={() => onEdit("media")}
              >
                {item.photo ? (
                  <img src={item.photo} alt="" />
                ) : (
                  <span className="r-record-check__empty" aria-hidden="true">
                    <Icon name="fork" />
                  </span>
                )}
                <span>
                  <b>{item.name}</b>
                  {item.price && <small>{formatWon(Number(item.price.replace(/\D/g, "")))}</small>}
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        )}

        <div className="r-record-edit-part">
          <b className="r-record-edit-part__title">기록 이유</b>
          <button type="button" className="r-record-edit-reason" onClick={() => onEdit("story")}>
            <span>{form.reason || "추천 이유를 남겨 주세요."}</span>
            <small>
              {form.reason.length} / {REASON_MAX}
            </small>
          </button>
        </div>

        <button type="button" className="r-record-edit-part r-record-edit-tags" onClick={() => onEdit("taste")}>
          <b className="r-record-edit-part__title">태그</b>
          <span>
            {tagChips || <small>고른 태그가 없어요</small>}
            <Icon name="chevron" />
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="r-record-step" aria-label="기록 확인">
      <RecordStepTitle
        lead={
          <>
            장소, 사진, 이유, 태그를 확인하고
            <br />
            필요한 내용은 각 단계에서 수정할 수 있어요.
          </>
        }
      >
        기록을 저장하기 전,
        <br />
        내용을 확인해 주세요.
      </RecordStepTitle>

      {placeCard}

      <div className="r-record-check">
        <CardHead icon="pencil" title={`사진 ${form.photos.length}장`} onEdit={() => onEdit("media")} />
        {form.photos.length > 0 && (
          <div className="r-record-check__photos">
            {form.photos.slice(0, PREVIEW_PHOTO_LIMIT).map((photo, index) => (
              <img key={`${photo.slice(-24)}-${index}`} src={photo} alt="" />
            ))}
          </div>
        )}
      </div>

      <div className="r-record-check">
        <CardHead icon="pencil" title="기록 이유" onEdit={() => onEdit("story")} />
        <p className="r-record-check__quote">{headline ? <>&ldquo;{headline}&rdquo;</> : "추천 이유를 남겨 주세요."}</p>
      </div>

      <div className="r-record-check">
        <CardHead icon="tag" title="태그" onEdit={() => onEdit("taste")} />
        {tagChips || <p className="r-record-check__quote">고른 태그가 없어요.</p>}
      </div>
    </section>
  );
}
