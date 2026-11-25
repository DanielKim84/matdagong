import { useRef, type ReactNode } from "react";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import PaginationDots from "../../components/PaginationDots";
import { useSwipe } from "../../hooks/useSwipe";
import { wrapIndex } from "../../utils/pagination";
import { IMAGE_ACCEPT, MAX_COVER_COUNT } from "../../utils/profileImages";
import type { ProfileForm } from "./useProfileForm";

/**
 * 프로필 배경 사진 갤러리(넘겨 보기, 추가, 삭제)입니다. 실제 반영은 프로필 저장 때 합니다.
 * middle은 큰 미리보기와 작은 사진 줄 사이에 둘 내용(배경 사진 편집 화면의 장수·안내, 보드 15-02)입니다.
 */
export default function CoverEditor({ form, middle }: { form: ProfileForm; middle?: ReactNode }) {
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
        {/* 보드 15-02: 오른쪽 아래 흰 동그라미 +, 첫 장을 볼 때만 왼쪽 위 코랄 "대표" */}
        {gallery.length < MAX_COVER_COUNT && (
          <button type="button" aria-label="배경 사진 추가" onClick={() => input.current?.click()}>
            <Icon name="plus" />
          </button>
        )}
        {gallery.length > 0 && previewIndex === 0 && (
          <span className="profile-primary-cover-badge">
            <Icon name="crown" />
            대표
          </span>
        )}
        {gallery.length === 0 && <span className="profile-default-cover-badge">기본 배경</span>}
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
      {middle}
      {gallery.length > 0 && (
        <div className="profile-edit-cover-thumbnails" aria-label="등록한 배경 사진">
          {gallery.map((url, index) => (
            <div className="profile-edit-cover-thumbnail" key={`${url}-${index}`}>
              <button
                type="button"
                className="profile-edit-cover-thumbnail-preview"
                aria-label={`배경 사진 ${index + 1} 미리보기`}
                aria-pressed={previewIndex === index}
                onClick={() => setPreviewIndex(index)}
              >
                <img src={url} alt="" loading="lazy" />
                {index === 0 && (
                  <span className="profile-edit-cover-thumbnail-badge">
                    <Icon name="crown" />
                    대표
                  </span>
                )}
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
          {gallery.length < MAX_COVER_COUNT && (
            <button
              type="button"
              className="profile-edit-cover-thumbnail-add"
              onClick={() => input.current?.click()}
              disabled={form.isSaving}
            >
              <Icon name="plus" />
              사진 추가
            </button>
          )}
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
