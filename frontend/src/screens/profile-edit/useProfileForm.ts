import { useEffect, useState, type FormEvent } from "react";
import type { ActivityScope, FoodFocus, MyProfile, ProfileChanges, TasteTag } from "../../models/community";
import { filterTagsForFocus } from "../../models/tasteTags";
import { errorMessage } from "../../utils/errorMessage";
import {
  EMPTY_REGION_SELECTION,
  isIncompleteRegion,
  joinRegionSelection,
  restoreRegionSelection,
  type RegionSelection,
} from "./regionSelection";
import { useAvatarDraft } from "./useAvatarDraft";
import { useCoverDraft } from "./useCoverDraft";
import { useRegionCatalog } from "./useRegionCatalog";

export type ProfileTab = "profile" | "taste";

export const MAX_NICKNAME_LENGTH = 12;
export const MAX_INTRO_LENGTH = 300;

/** 프로필 편집 화면의 입력 상태와 저장 동작입니다. 두 탭이 한 폼을 함께 저장합니다. */
export function useProfileForm({
  profile,
  options,
  initialTab,
  onSave,
  onError,
}: {
  profile: MyProfile;
  options: TasteTag[];
  initialTab: ProfileTab;
  onSave: (changes: ProfileChanges) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const { regions, hasCatalogError } = useRegionCatalog();
  const avatar = useAvatarDraft(onError);
  const cover = useCoverDraft(profile, onError);
  // 실제로 피하고 싶은 조건만 제외 태그로 두고, 나머지는 소개·추천 취향에 씁니다.
  const positiveOptions = options.filter((tag) => tag.tagGroup !== "VISIT");
  const avoidOptions = options.filter((tag) => tag.tagGroup === "VISIT");
  const [nickname, setNickname] = useState(profile.nickname.slice(0, MAX_NICKNAME_LENGTH));
  const [intro, setIntro] = useState(profile.intro ?? "");
  const [profileTags, setProfileTags] = useState(profile.profileTags ?? []);
  const [preferenceTags, setPreferenceTags] = useState(profile.preferenceTags ?? []);
  const [excludedTags, setExcludedTags] = useState(profile.excludedTags ?? []);
  const [tasterFocus, setTasterFocus] = useState<FoodFocus>(profile.tasterFocus ?? "BOTH");
  const [activityScope, setActivityScope] = useState<ActivityScope>(profile.activityScope ?? "LOCAL");
  const [activityRegion, setActivityRegion] = useState<RegionSelection>(EMPTY_REGION_SELECTION);
  const [hasRegionChanged, setHasRegionChanged] = useState(false);
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>(profile.preferenceFocus ?? "BOTH");
  const [isSaving, setIsSaving] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

  useEffect(() => {
    if (regions.length) setActivityRegion(restoreRegionSelection(profile.activityRegion, regions));
  }, [regions, profile.activityRegion]);

  function changeNickname(value: string) {
    setNickname(value.slice(0, MAX_NICKNAME_LENGTH));
  }

  function changeIntro(value: string) {
    setIntro(value.slice(0, MAX_INTRO_LENGTH));
  }

  function changeTasterFocus(focus: FoodFocus) {
    setTasterFocus(focus);
    setProfileTags((current) => filterTagsForFocus(current, focus, positiveOptions));
  }

  function changePreferenceFocus(focus: FoodFocus) {
    setPreferenceFocus(focus);
    setPreferenceTags((current) => filterTagsForFocus(current, focus, positiveOptions));
  }

  // 좋아하는 태그와 제외 태그는 서로 겹치지 않게 한쪽에서 고르면 다른 쪽에서 뺍니다.
  function changePreferenceTags(tags: string[]) {
    setPreferenceTags(tags);
    setExcludedTags((current) => current.filter((tag) => !tags.includes(tag)));
  }

  function changeExcludedTags(tags: string[]) {
    setExcludedTags(tags);
    setPreferenceTags((current) => current.filter((tag) => !tags.includes(tag)));
  }

  function changeActivityScope(scope: ActivityScope) {
    setActivityScope(scope);
    if (scope === "TRAVEL") {
      setActivityRegion(EMPTY_REGION_SELECTION);
      setHasRegionChanged(true);
    }
  }

  function changeActivityRegion(selection: RegionSelection) {
    setActivityRegion(selection);
    setHasRegionChanged(true);
  }

  /** 공개 스타일로는 추천 분야와 선호 태그만 복사하고, 제외 조건은 공개하지 않습니다. */
  function copyPreferenceToProfile() {
    setTasterFocus(preferenceFocus);
    setProfileTags(filterTagsForFocus(preferenceTags, preferenceFocus, positiveOptions));
    setCopyNotice("추천 취향을 가져왔어요. 확인한 뒤 프로필 저장을 눌러 주세요.");
  }

  function savedActivityRegion() {
    if (activityScope === "TRAVEL") return "";
    return hasRegionChanged ? joinRegionSelection(activityRegion) : (profile.activityRegion ?? "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) {
      setActiveTab("profile");
      onError("맛객 닉네임을 입력해 주세요.");
      return;
    }
    if (activityScope !== "TRAVEL" && hasRegionChanged && isIncompleteRegion(activityRegion)) {
      setActiveTab("profile");
      onError("주 활동 지역은 시·도, 시·군·구, 읍·면·동까지 선택해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        nickname: nickname.trim(),
        intro: intro.trim(),
        profileTags: filterTagsForFocus(profileTags, tasterFocus, positiveOptions),
        tasterFocus,
        activityScope,
        activityRegion: savedActivityRegion(),
        preferenceFocus,
        preferenceTags: filterTagsForFocus(preferenceTags, preferenceFocus, positiveOptions),
        excludedTags,
        avatarFile: avatar.file,
        coverFiles: cover.files,
        removedCoverPhotoIds: cover.removedPhotoIds,
        removeAvatar: avatar.isRemoved,
        removeCover: cover.isAllRemoved,
      });
      avatar.reset();
      cover.reset();
    } catch (cause) {
      onError(errorMessage(cause, "잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    profile,
    activeTab,
    setActiveTab,
    regions,
    hasCatalogError,
    avatar,
    cover,
    positiveOptions,
    avoidOptions,
    nickname,
    changeNickname,
    intro,
    changeIntro,
    profileTags,
    setProfileTags,
    preferenceTags,
    changePreferenceTags,
    excludedTags,
    changeExcludedTags,
    tasterFocus,
    changeTasterFocus,
    preferenceFocus,
    changePreferenceFocus,
    activityScope,
    changeActivityScope,
    activityRegion,
    changeActivityRegion,
    copyNotice,
    copyPreferenceToProfile,
    isSaving,
    submit,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
