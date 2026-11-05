import Icon from "../../components/Icon";
import { SectionHead } from "../../components/ui";
import { MAX_MENUS, MAX_PHOTOS, MENU_NAME_MAX, formatPriceInput } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

/** 2단계 · 사진과 추천 메뉴 */
export default function MediaStep({ form }: { form: RecordForm }) {
  const { photos, menus } = form;
  return (
    <section className="r-record-step" aria-label="사진과 메뉴">
      <RecordStepTitle lead="첫 번째 사진이 기록의 대표 사진이 돼요.">
        사진과 메뉴를
        <br />
        남겨 주세요
      </RecordStepTitle>

      <div className="r-record-field">
        <SectionHead className="r-record-field-head" title="사진" meta={`필수 · ${photos.length}/${MAX_PHOTOS}`} />
        <div className="r-record-photos">
          {photos.length < MAX_PHOTOS && (
            <label className={`r-record-photo-add ${form.isBusy ? "is-busy" : ""}`}>
              <Icon name="camera" />
              <span>{form.isBusy ? "준비 중…" : "사진 추가"}</span>
              <input
                className="visually-hidden"
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                disabled={form.isBusy || form.isSaving}
                onChange={(event) => void form.addPhotos(event)}
              />
            </label>
          )}
          {photos.map((photo, index) => (
            <div className="r-record-photo" key={`${photo.slice(-24)}-${index}`}>
              <button
                type="button"
                className="r-record-photo__image"
                aria-label={index === 0 ? `사진 ${index + 1}, 대표 사진` : `사진 ${index + 1}을 대표 사진으로 지정`}
                onClick={() => form.makeCoverPhoto(index)}
              >
                <img src={photo} alt="" loading="lazy" />
              </button>
              {index === 0 && <span className="r-record-photo__cover">대표</span>}
              <button
                type="button"
                className="r-record-photo__remove"
                aria-label={`사진 ${index + 1} 삭제`}
                disabled={form.isBusy || form.isSaving}
                onClick={() => void form.removePhotoAt(index)}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
        {photos.length > 1 && <small className="r-record-help">사진을 누르면 대표 사진으로 바꿀 수 있어요.</small>}
      </div>

      <div className="r-record-field">
        <SectionHead className="r-record-field-head" title="추천 메뉴" meta={`선택 · 최대 ${MAX_MENUS}개`} />
        <div className="r-record-dishes">
          {menus.map((item, index) => (
            <div className="r-card r-record-dish" key={index}>
              <div className="r-record-dish__media">
                <label className="r-record-dish__photo">
                  {item.photo ? (
                    <img src={item.photo} alt={`${item.name || `메뉴 ${index + 1}`} 사진`} />
                  ) : (
                    <>
                      <Icon name="camera" />
                      <small>사진</small>
                    </>
                  )}
                  <input
                    className="visually-hidden"
                    type="file"
                    accept={PHOTO_ACCEPT}
                    aria-label={`추천 메뉴 ${index + 1} 사진`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void form.setMenuPhoto(index, file);
                    }}
                  />
                </label>
                {item.photo && (
                  <button
                    type="button"
                    className="r-record-dish__photo-remove"
                    aria-label={`메뉴 ${index + 1} 사진 삭제`}
                    onClick={() => form.updateMenu(index, { photo: undefined })}
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
              <div className="r-record-dish__fields">
                <input
                  value={item.name}
                  maxLength={MENU_NAME_MAX}
                  placeholder="메뉴 이름 (예: 해물찜)"
                  aria-label={`추천 메뉴 ${index + 1} 이름`}
                  onChange={(event) => form.updateMenu(index, { name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index === menus.length - 1 && menus.length < MAX_MENUS) {
                      event.preventDefault();
                      form.addMenu();
                    }
                  }}
                />
                <span className="r-record-dish__price">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.price}
                    placeholder="가격 (선택)"
                    aria-label={`추천 메뉴 ${index + 1} 가격`}
                    onChange={(event) => form.updateMenu(index, { price: formatPriceInput(event.target.value) })}
                  />
                  <i>원</i>
                </span>
              </div>
              {(menus.length > 1 || item.name || item.price || item.photo) && (
                <button
                  type="button"
                  className="r-icon-button r-record-dish__remove"
                  aria-label={`메뉴 ${index + 1} 삭제`}
                  onClick={() => void form.removeMenu(index)}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
          ))}
        </div>
        {menus.length < MAX_MENUS && (
          <button type="button" className="r-record-dashed" onClick={form.addMenu}>
            <Icon name="plus" />
            메뉴 추가
          </button>
        )}
      </div>
    </section>
  );
}
