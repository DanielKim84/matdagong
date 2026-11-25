import { useState, type FormEvent } from "react";
import { useAppData } from "../app/AppData";
import { back } from "../app/navigation";
import { TopBar } from "../components/ui";
import type { MyProfile } from "../models/community";
import CoverEditView from "./profile-edit/CoverEditView";
import PublicProfileTab from "./profile-edit/PublicProfileTab";
import PublicStyleSettings from "./profile-edit/PublicStyleSettings";
import TastePreferenceTab from "./profile-edit/TastePreferenceTab";
import { useProfileForm, type ProfileView } from "./profile-edit/useProfileForm";
import TasteTagRequestScreen from "./TasteTagRequestScreen";

const TITLES: Record<ProfileView, string> = {
  profile: "공개 프로필 편집",
  cover: "배경 사진 편집",
  style: "공개 스타일 태그",
  taste: "추천 취향·제외 조건",
};

/**
 * 프로필 편집(보드 15)입니다. 공개 프로필(15-01)에서 배경 사진(15-02) · 공개 스타일 태그(15-03) · 추천 취향(15-04)으로 들어가며,
 * 네 화면이 한 폼을 함께 써서 어디서 저장해도 전부 저장합니다. 하위 화면은 저장하면 공개 프로필 화면으로 돌아갑니다.
 */
export default function ProfileSettingsScreen({ profile, view }: { profile: MyProfile; view: ProfileView }) {
  const { accessToken, tasteTags, actions } = useAppData();
  const form = useProfileForm({
    accessToken,
    profile,
    options: tasteTags,
    onSave: actions.saveProfile,
    onError: (message) => actions.notify({ kind: "error", title: "프로필을 저장하지 못했어요", message }),
  });
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const isSub = view !== "profile";

  async function submit(event: FormEvent<HTMLFormElement>) {
    if ((await form.submit(event)) && isSub) back("profile-edit");
  }
  /** 배경 사진 취소: 이번에 고른 사진·삭제를 되돌리고 공개 프로필 화면으로 돌아갑니다. */
  function cancelCover() {
    form.cover.reset();
    back("profile-edit");
  }

  return (
    <>
      <main className="r-screen r-me-edit profile-settings">
        <TopBar title={TITLES[view]} fallback={isSub ? "profile-edit" : "my"} />
        <form onSubmit={(event) => void submit(event)}>
          {view === "profile" && <PublicProfileTab form={form} />}
          {view === "cover" && <CoverEditView form={form} />}
          {view === "style" && <PublicStyleSettings form={form} />}
          {view === "taste" && <TastePreferenceTab form={form} onRequestTag={() => setIsRequestOpen(true)} />}
          <footer className={`settings-save-bar r-me-edit__save ${view === "cover" ? "has-cancel" : ""}`}>
            {view === "cover" && (
              <button className="r-button r-button--secondary" type="button" onClick={cancelCover}>
                취소
              </button>
            )}
            <button className="r-button r-button--primary r-button--block" type="submit" disabled={form.isSaving}>
              {form.isSaving ? "저장하는 중…" : "저장"}
            </button>
          </footer>
        </form>
      </main>
      {isRequestOpen && (
        <TasteTagRequestScreen
          onClose={() => setIsRequestOpen(false)}
          onRequest={actions.requestTag}
          onLoad={actions.loadTagRequests}
        />
      )}
    </>
  );
}
