import AvatarEditor from "./AvatarEditor";
import CoverEditor from "./CoverEditor";
import PublicStyleSettings from "./PublicStyleSettings";
import { MAX_INTRO_LENGTH, MAX_NICKNAME_LENGTH, type ProfileForm } from "./useProfileForm";

/** 공개 프로필 탭: 사진, 배경, 닉네임·소개, 공개 맛집 스타일입니다. */
export default function PublicProfileTab({ form }: { form: ProfileForm }) {
  const isActive = form.activeTab === "profile";
  return (
    <section className="settings-panel" hidden={!isActive} aria-label="공개 프로필 설정">
      <div className="profile-edit-form">
        <AvatarEditor form={form} />
      </div>
      <CoverEditor form={form} />
      <div className="profile-edit-form">
        <div className="r-card profile-edit-card">
          <label className="profile-edit-field">
            <span>
              닉네임 <em>필수</em>
            </span>
            <input
              value={form.nickname}
              onChange={(event) => form.changeNickname(event.target.value)}
              maxLength={MAX_NICKNAME_LENGTH}
              required={isActive}
              placeholder="맛다공에서 사용할 이름"
            />
            <small>
              {form.nickname.length}/{MAX_NICKNAME_LENGTH}자 · 다른 맛객과 겹치지 않는 이름으로 정해 주세요.
            </small>
          </label>
          <label className="profile-edit-field">
            <span>
              나를 소개해 주세요 <small>선택</small>
            </span>
            <textarea
              value={form.intro}
              onChange={(event) => form.changeIntro(event.target.value)}
              maxLength={MAX_INTRO_LENGTH}
              rows={3}
              placeholder="내가 좋아하는 한 끼, 자주 찾는 동네…"
            />
            <small>
              {form.intro.length}/{MAX_INTRO_LENGTH}자 · 다른 사람에게 공개돼요.
            </small>
          </label>
        </div>
        <PublicStyleSettings form={form} />
      </div>
    </section>
  );
}
