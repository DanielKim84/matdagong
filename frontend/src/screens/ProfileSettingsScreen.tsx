import { useState } from "react";
import { useAppData } from "../app/AppData";
import Icon from "../components/Icon";
import { Segmented, TopBar } from "../components/ui";
import type { MyProfile } from "../models/community";
import PublicProfileTab from "./profile-edit/PublicProfileTab";
import TastePreferenceTab from "./profile-edit/TastePreferenceTab";
import { useProfileForm, type ProfileTab } from "./profile-edit/useProfileForm";
import TasteTagRequestSheet from "./TasteTagRequestSheet";

const TAB_OPTIONS: { value: ProfileTab; label: string }[] = [
  { value: "profile", label: "공개 프로필" },
  { value: "taste", label: "추천 취향" },
];

/** 프로필 편집 화면입니다. 공개 프로필과 비공개 추천 취향을 탭으로 나누고 한 번에 저장합니다. */
export default function ProfileSettingsScreen({
  profile,
  initialTab = "profile",
}: {
  /** 불러온 내 프로필(ProfileEditRoute가 불러온 뒤에만 이 화면을 그립니다) */
  profile: MyProfile;
  initialTab?: ProfileTab;
}) {
  const { tasteTags, actions } = useAppData();
  const form = useProfileForm({
    profile,
    options: tasteTags,
    initialTab,
    onSave: actions.saveProfile,
    onError: (message) => actions.notify({ kind: "error", title: "프로필을 저장하지 못했어요", message }),
  });
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  return (
    <>
      <main className="r-screen r-me-edit profile-settings">
        <TopBar title="프로필 편집" fallback="my" />
        <div className="r-me-edit__tabs">
          <Segmented<ProfileTab>
            label="설정 구분"
            value={form.activeTab}
            onChange={form.setActiveTab}
            options={TAB_OPTIONS}
          />
        </div>
        <form onSubmit={(event) => void form.submit(event)}>
          <PublicProfileTab form={form} />
          <TastePreferenceTab form={form} />
          {form.activeTab === "taste" && (
            <button className="r-card tag-request-entry" type="button" onClick={() => setIsRequestOpen(true)}>
              <span className="tag-request-entry-icon">
                <Icon name="message" />
              </span>
              <span>
                <b>찾는 태그가 없나요?</b>
                <small>원하는 태그를 제안해 주세요</small>
              </span>
              <Icon name="chevron" />
            </button>
          )}
          <footer className="settings-save-bar r-me-edit__save">
            <button className="r-button r-button--primary r-button--block" type="submit" disabled={form.isSaving}>
              {form.isSaving ? "저장하는 중…" : form.activeTab === "profile" ? "프로필 저장" : "취향 저장"}
            </button>
          </footer>
        </form>
      </main>
      {isRequestOpen && (
        <TasteTagRequestSheet
          onClose={() => setIsRequestOpen(false)}
          onRequest={actions.requestTag}
          onLoad={actions.loadTagRequests}
        />
      )}
    </>
  );
}
