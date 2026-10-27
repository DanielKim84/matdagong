import { useEffect, useRef, useState, type FormEvent } from "react";
import { ScreenHeader } from "../components/AppChrome";
import { Avatar } from "../components/BrandAssets";
import Icon from "../components/Icon";
import TasteTagPicker from "../components/TasteTagPicker";
import FoodFocusPicker from "../components/FoodFocusPicker";
import TasteTagRequestSheet from "./TasteTagRequestSheet";
import { isVisitCondition } from "../models/place";
import type { FoodFocus, MyProfile, TasteTag, TagRequest, TagRequestInput } from "../services/community";

type ProfileChanges = {
  nickname: string;
  intro: string;
  avatarFile?: File;
  coverFile?: File;
  removeAvatar?: boolean;
  removeCover?: boolean;
  profileTags: string[];
  tasterFocus: FoodFocus;
  preferenceFocus: FoodFocus;
  preferenceTags: string[];
  excludedTags: string[];
};

export default function ProfileSettingsScreen({
  profile,
  options,
  onSave,
  onError,
  onRequestTag,
  onLoadTagRequests,
}: {
  profile: MyProfile;
  options: TasteTag[];
  onSave: (changes: ProfileChanges) => Promise<void>;
  onError: (message: string) => void;
  onRequestTag: (input: TagRequestInput) => Promise<TagRequest>;
  onLoadTagRequests: () => Promise<TagRequest[]>;
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "taste">("profile");
  const [requestOpen, setRequestOpen] = useState(false);
  // 장소의 불편 조건은 공개 소개·선호 태그와 섞지 않고 제외 설정에만 표시합니다.
  const positiveOptions = options.filter((tag) => !isVisitCondition(tag.name));
  const avoidOptions = options.filter((tag) => isVisitCondition(tag.name));
  const [nickname, setNickname] = useState(profile.nickname);
  const [intro, setIntro] = useState(profile.intro ?? "");
  const [avatarFile, setAvatarFile] = useState<File>();
  const [coverFile, setCoverFile] = useState<File>();
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [profileTags, setProfileTags] = useState(profile.profileTags ?? []);
  const [preferenceTags, setPreferenceTags] = useState(profile.preferenceTags ?? []);
  const [excludedTags, setExcludedTags] = useState(profile.excludedTags ?? []);
  const [tasterFocus, setTasterFocus] = useState<FoodFocus>(profile.tasterFocus ?? "BOTH");
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>(profile.preferenceFocus ?? "BOTH");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [coverPreview, setCoverPreview] = useState<string>();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  function chooseImage(file: File | undefined, kind: "avatar" | "cover") {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      onError("JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("이미지는 5MB 이하로 선택해 주세요.");
      return;
    }
    if (kind === "avatar") {
      setAvatarFile(file);
      setRemoveAvatar(false);
    } else {
      setCoverFile(file);
      setRemoveCover(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) {
      setActiveTab("profile");
      onError("맛객 닉네임을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nickname: nickname.trim(),
        intro: intro.trim(),
        profileTags,
        tasterFocus,
        preferenceFocus,
        preferenceTags,
        excludedTags,
        avatarFile,
        coverFile,
        removeAvatar,
        removeCover,
      });
      // 저장이 끝난 파일은 비워 다음 저장에서 같은 이미지를 다시 업로드하지 않습니다.
      setAvatarFile(undefined);
      setCoverFile(undefined);
      setRemoveAvatar(false);
      setRemoveCover(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ScreenHeader title="내 설정" />
      <main className="profile-settings redesigned-settings">
        <div className="settings-view-switch" role="group" aria-label="설정 구분">
          <button type="button" aria-pressed={activeTab === "profile"} onClick={() => setActiveTab("profile")}>
            <Icon name="user" /> 프로필
          </button>
          <button type="button" aria-pressed={activeTab === "taste"} onClick={() => setActiveTab("taste")}>
            <Icon name="heart" /> 추천 취향
          </button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          <section className="settings-panel" hidden={activeTab !== "profile"} aria-label="공개 프로필 설정">
            <div className="profile-edit-cover">
              <img src={coverPreview ?? (removeCover ? "/assets/profile-cover.png" : profile.profileCoverUrl ?? "/assets/profile-cover.png")} alt="프로필 배경 미리보기" />
              <button type="button" onClick={() => coverInput.current?.click()}><Icon name="camera" /> 배경 바꾸기</button>
              {(profile.profileCoverUrl || coverFile) && !removeCover && (
                <button className="profile-image-reset" type="button" onClick={() => {
                  setCoverFile(undefined); setRemoveCover(true);
                  if (coverInput.current) coverInput.current.value = "";
                }}>기본 배경</button>
              )}
              <input ref={coverInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseImage(event.target.files?.[0], "cover")} />
            </div>
            <div className="profile-edit-form">
              <section className="profile-edit-avatar-section">
                <button className="profile-edit-avatar-button" type="button" onClick={() => avatarInput.current?.click()} aria-label="프로필 사진 변경">
                  <Avatar src={avatarPreview ?? (removeAvatar ? null : profile.profileImgUrl)} name={nickname || profile.nickname} variant={profile.avatarVariant} />
                  <span><Icon name="camera" /></span>
                </button>
                <input ref={avatarInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => chooseImage(event.target.files?.[0], "avatar")} />
                <div><b>나를 소개하는 사진</b><small>맛객 목록과 내 프로필에 보여요.</small></div>
                {(profile.profileImgUrl || avatarFile) && !removeAvatar && (
                  <button className="text-action" type="button" onClick={() => {
                    setAvatarFile(undefined); setRemoveAvatar(true);
                    if (avatarInput.current) avatarInput.current.value = "";
                  }}>기본 캐릭터</button>
                )}
              </section>
              <label className="profile-edit-field">
                <span>닉네임 <em>필수</em></span>
                <input value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 30))}
                  maxLength={30} required={activeTab === "profile"} placeholder="맛다공에서 사용할 이름" />
                <small>{nickname.length}/30자 · 다른 맛객과 겹치지 않는 이름으로 정해 주세요.</small>
              </label>
              <label className="profile-edit-field">
                <span>나를 소개해 주세요 <small>선택</small></span>
                <textarea value={intro} onChange={(event) => setIntro(event.target.value.slice(0, 300))}
                  maxLength={300} rows={3} placeholder="내가 좋아하는 한 끼, 자주 찾는 동네…" />
                <small>{intro.length}/300자 · 다른 사람에게 공개돼요.</small>
              </label>
              <details className="public-style-settings">
                <summary><span><b>맛객 스타일 소개 <em>선택 · 공개</em></b><small>내 맛집을 공유한다면 스타일도 알려 주세요.</small></span><Icon name="chevron" /></summary>
                <div>
                  <p>내가 주로 소개하는 맛집 스타일이에요.<br />나에게 추천받을 취향과 다르게 설정해도 괜찮아요.</p>
                  <button type="button" className="copy-taste-button" onClick={() => {
                    setTasterFocus(preferenceFocus);
                    setProfileTags(preferenceTags.filter((name) => positiveOptions.some((tag) => tag.name === name)));
                  }}><Icon name="heart" /> 내 추천 취향 가져오기</button>
                  <FoodFocusPicker label="어떤 곳을 소개하나요?" value={tasterFocus} onChange={setTasterFocus} />
                  <TasteTagPicker options={positiveOptions} value={profileTags} onChange={setProfileTags} />
                </div>
              </details>
              <p className="profile-image-hint"><Icon name="image" /> JPG, PNG, WEBP · 사진 한 장당 최대 5MB</p>
            </div>
          </section>
          <section className="settings-panel taste-settings-panel" hidden={activeTab !== "taste"} aria-label="비공개 추천 취향 설정">
            <div className="taste-settings-intro"><span><Icon name="heart" /></span><h2>오늘도, 내 입맛대로</h2><p>좋아하는 취향을 알려 주시면<br />나와 잘 맞는 맛객을 먼저 추천해 드려요.</p><small>나만의 설정이에요 · 프로필에 공개되지 않아요</small></div>
            <section className="taste-settings-block">
              <FoodFocusPicker label="어떤 곳을 찾고 있나요?" value={preferenceFocus} onChange={setPreferenceFocus} />
            </section>
            <section className="taste-settings-block">
              <div className="taste-section-heading"><h2>이런 곳이 좋아요</h2><span>최대 5개</span></div>
              <TasteTagPicker options={positiveOptions} value={preferenceTags} onChange={(tags) => {
                setPreferenceTags(tags);
                setExcludedTags((current) => current.filter((tag) => !tags.includes(tag)));
              }} />
            </section>
            <section className="taste-settings-block avoid-settings-block">
              <div className="taste-section-heading"><h2>이런 곳은 피할래요</h2><span>선택</span></div>
              <p>해당 조건이 등록된 맛집은 홈과 지도에서 숨겨요.</p>
              <TasteTagPicker options={avoidOptions} value={excludedTags} categoriesToShow={["VISIT"]} showCategoryLabels={false}
                onChange={(tags) => {
                  setExcludedTags(tags);
                  setPreferenceTags((current) => current.filter((tag) => !tags.includes(tag)));
                }} />
            </section>
          </section>
          <button className="tag-request-entry" type="button" onClick={() => setRequestOpen(true)}>
            <span className="tag-request-entry-icon"><Icon name="message" /></span>
            <span><b>찾는 태그가 없나요?</b><small>원하는 태그를 제안해 주세요</small></span><Icon name="chevron" />
          </button>
          <footer className="settings-save-bar">
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "저장하는 중…" : activeTab === "profile" ? "프로필 저장" : "취향 저장"}</button>
          </footer>
        </form>
      </main>
      {requestOpen && <TasteTagRequestSheet onClose={() => setRequestOpen(false)} onRequest={onRequestTag} onLoad={onLoadTagRequests} />}
    </>
  );
}
