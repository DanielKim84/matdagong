import { useRef } from "react";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import PaginationDots from "../../components/PaginationDots";
import { useSwipe } from "../../hooks/useSwipe";
import { wrapIndex } from "../../utils/pagination";
import { IMAGE_ACCEPT, MAX_COVER_COUNT } from "./profileImages";
import type { ProfileForm } from "./useProfileForm";

/** 프로필 배경 사진 갤러리(넘겨 보기, 추가, 삭제)입니다. 실제 반영은 프로필 저장 때 합니다. */
export default function CoverEditor({ form }: { form: ProfileForm }) {
  const { confirm } = useNotificationDialog();
  const { cover } = form;
  const { gallery, previewIndex, setPreviewIndex } = cover;
  const input = useRef<HTMLInputElement>(null);
  const swipe = useSwipe({
    onLeft: () => setPreviewIndex((current) => wrapIndex(current, 1, gallery.length)),
    onRight: () => setPreviewIndex((current) => wrapIndex(current, -1, gallery.length)),
    threshold: 40,
    isEnabled: gallery.length > 0,
  });

  async function removeAt(index: number) {
    const isConfirmed = await confirm({
      title: "배경 사진을 삭제할까요?",
      message: "프로필 저장을 누르면 삭제돼요.",
      confirmLabel: "삭제할게요",
      tone: "danger",
    });
    if (isConfirmed) cover.removeAt(index);
  }

  return (
    <>
      <div className="profile-edit-cover" {...swipe}>
        <div className="profile-edit-cover-track" style={{ transform: `translateX(-${previewIndex * 100}%)` }}>
          {(gallery.length ? gallery : [cover.activePreview]).map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={`프로필 배경 미리보기 ${gallery.length ? `${index + 1} / ${gallery.length}` : ""}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => input.current?.click()}>
          <Icon name="camera" /> 배경 사진 추가
        </button>
        {gallery.length > 0 && previewIndex === 0 && <span className="profile-primary-cover-badge">대표 사진</span>}
        {gallery.length === 0 && <span className="profile-default-cover-badge">기본 배경</span>}
        <span className="profile-cover-count">
          {gallery.length}/{MAX_COVER_COUNT}장
        </span>
      </div>
      {gallery.length > 0 && (
        <PaginationDots
          activeIndex={previewIndex}
          total={gallery.length}
          onSelect={setPreviewIndex}
          className="profile-edit-cover-indicators"
          label="배경 사진 페이지"
        />
      )}
      {gallery.length > 0 && (
        <div className="profile-edit-cover-thumbnails" aria-label="등록한 배경 사진">
          {gallery.map((url, index) => (
            <div className="profile-edit-cover-thumbnail" key={`${url}-${index}`}>
              <button
                type="button"
                className={`profile-edit-cover-thumbnail-preview${previewIndex === index ? " is-active" : ""}`}
                aria-label={`배경 사진 ${index + 1} 미리보기`}
                aria-pressed={previewIndex === index}
                onClick={() => setPreviewIndex(index)}
              >
                <img src={url} alt="" loading="lazy" />
              </button>
              <button
                type="button"
                className="profile-edit-cover-thumbnail-delete"
                aria-label={`배경 사진 ${index + 1} 삭제`}
                disabled={form.isSaving}
                onClick={() => void removeAt(index)}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        onChange={(event) => {
          cover.choose(event.target.files);
          event.target.value = "";
        }}
      />
    </>
  );
}
