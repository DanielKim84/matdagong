import Icon from "../../components/Icon";
import { MAX_COVER_COUNT } from "../../utils/profileImages";
import CoverEditor from "./CoverEditor";
import type { ProfileForm } from "./useProfileForm";

/** 배경 사진 편집(보드 15-02): 큰 미리보기와 작은 사진 줄(CoverEditor) 사이에 "배경 사진 (n/10)" · 장수 안내 · 회색 "저장 시 반영" 안내입니다. */
export default function CoverEditView({ form }: { form: ProfileForm }) {
  return (
    <section className="settings-panel cover-edit-view" aria-label="배경 사진 편집">
      <CoverEditor
        form={form}
        middle={
          <>
            <div className="cover-edit-view__head">
              <h2>
                배경 사진 ({form.cover.gallery.length}/{MAX_COVER_COUNT})
              </h2>
              <p>최대 {MAX_COVER_COUNT}장까지 등록할 수 있어요.</p>
            </div>
            <p className="r-info-note">
              <Icon name="info" />
              사진 추가·삭제는 프로필 저장 시 반영돼요.
            </p>
          </>
        }
      />
    </section>
  );
}
