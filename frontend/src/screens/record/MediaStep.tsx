import { useRef, useState } from "react";
import Icon from "../../components/Icon";
import PaginationDots from "../../components/PaginationDots";
import { MAX_MENUS, MAX_PHOTOS, MENU_NAME_MAX, formatPriceInput } from "./recordModel";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * 2단계 · 사진과 메뉴(보드 11-02): 위쪽 큰 사진 넘기기(첫 장에 코랄 "대표 사진", 아래 점, 끝에 사진 추가 칸),
 * 그 아래 연한 코랄 상자 "메뉴 입력 (최대 5개)"와 "+ 메뉴 추가", 메뉴마다 왼쪽 사진 · 메뉴명 · 가격(선택) · 메뉴 사진 칸입니다.
 * 대표가 아닌 사진을 누르면 대표 사진으로 바꿉니다.
 */
export default function MediaStep({ form }: { form: RecordForm }) {
  const { photos, menus } = form;
  const track = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const canAddPhoto = photos.length < MAX_PHOTOS;
  const slideCount = photos.length + (canAddPhoto ? 1 : 0);

  function syncSlide() {
    const element = track.current;
    if (element?.clientWidth) setSlide(Math.round(element.scrollLeft / element.clientWidth));
  }
  function scrollToSlide(index: number) {
    const element = track.current;
    if (element) element.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  }

  const addPhotoInput = (
    <input
      className="visually-hidden"
      type="file"
      accept={PHOTO_ACCEPT}
      multiple
      disabled={form.isBusy || form.isSaving}
      onChange={(event) => void form.addPhotos(event)}
    />
  );

  return (
    <section className="r-record-step" aria-label="사진과 메뉴">
      <RecordStepTitle lead="이곳을 잘 보여주는 사진과 메뉴를 입력해 주세요.">2 · 사진과 메뉴</RecordStepTitle>

      <div className="r-record-cover">
        <div
          className="r-record-cover__track"
          ref={track}
          onScroll={syncSlide}
          aria-label={`사진 ${photos.length}/${MAX_PHOTOS}장`}
        >
          {photos.map((photo, index) => (
            <div className="r-record-cover__slide" key={`${photo.slice(-24)}-${index}`}>
              <button
                type="button"
                className="r-record-cover__image"
                aria-label={index === 0 ? `사진 ${index + 1}, 대표 사진` : `사진 ${index + 1}을 대표 사진으로 지정`}
                onClick={() => {
                  if (index === 0) return;
                  form.makeCoverPhoto(index);
                  scrollToSlide(0);
                }}
              >
                <img src={photo} alt="" loading="lazy" />
              </button>
              {index === 0 && <span className="r-record-cover__badge">대표 사진</span>}
              <button
                type="button"
                className="r-record-cover__remove"
                aria-label={`사진 ${index + 1} 삭제`}
                disabled={form.isBusy || form.isSaving}
                onClick={() => void form.removePhotoAt(index)}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
          {canAddPhoto && (
            <label className={`r-record-cover__slide r-record-cover__add ${form.isBusy ? "is-busy" : ""}`}>
              <Icon name="camera" />
              <b>{form.isBusy ? "준비 중…" : photos.length ? "사진 더 추가" : "사진 추가"}</b>
              <small>
                {photos.length}/{MAX_PHOTOS}장 · 첫 사진이 대표 사진이 돼요
              </small>
              {addPhotoInput}
            </label>
          )}
        </div>
        {slideCount > 1 && (
          <PaginationDots
            activeIndex={Math.min(slide, slideCount - 1)}
            total={slideCount}
            onSelect={scrollToSlide}
            label="사진"
          />
        )}
      </div>

      <div className="r-record-menus">
        <div className="r-record-menus__head">
          <b>
            메뉴 입력 <small>(최대 {MAX_MENUS}개)</small>
          </b>
          {menus.length < MAX_MENUS && (
            <button type="button" className="r-record-menus__add" onClick={form.addMenu}>
              <Icon name="plus" />
              메뉴 추가
            </button>
          )}
        </div>
        {menus.map((item, index) => {
          const photoInput = (
            <input
              className="visually-hidden"
              type="file"
              accept={PHOTO_ACCEPT}
              aria-label={`메뉴 ${index + 1} 사진`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void form.setMenuPhoto(index, file);
              }}
            />
          );
          return (
            <div className="r-record-dish" key={index}>
              <label className="r-record-dish__photo">
                {item.photo ? <img src={item.photo} alt="" /> : <Icon name="camera" />}
                {photoInput}
              </label>
              <div className="r-record-dish__fields">
                <label>
                  <span>메뉴명</span>
                  <input
                    value={item.name}
                    maxLength={MENU_NAME_MAX}
                    placeholder="예: 들기름국수"
                    onChange={(event) => form.updateMenu(index, { name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && index === menus.length - 1 && menus.length < MAX_MENUS) {
                        event.preventDefault();
                        form.addMenu();
                      }
                    }}
                  />
                </label>
                <label>
                  <span>가격(선택)</span>
                  <span className="r-record-dish__price">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.price}
                      placeholder="예: 8,500"
                      onChange={(event) => form.updateMenu(index, { price: formatPriceInput(event.target.value) })}
                    />
                    <i>원</i>
                  </span>
                </label>
                <div className="r-record-dish__photo-row">
                  <span>메뉴 사진</span>
                  {item.photo ? (
                    <button
                      type="button"
                      className="r-record-dish__photo-remove"
                      aria-label={`메뉴 ${index + 1} 사진 삭제`}
                      onClick={() => form.updateMenu(index, { photo: undefined })}
                    >
                      <img src={item.photo} alt="" />
                      <Icon name="close" />
                    </button>
                  ) : (
                    <label className="r-record-dish__photo-add">
                      <Icon name="plus" />
                      {photoInput}
                    </label>
                  )}
                </div>
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
          );
        })}
      </div>
    </section>
  );
}
