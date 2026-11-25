import { useState, type FormEvent } from "react";
import { RETRY_LATER_MESSAGE } from "../../app/AppData";
import { NICKNAME_TAKEN_MESSAGE } from "../../components/NicknameCheckNote";
import { useNicknameCheck } from "../../hooks/useNicknameCheck";
import {
  MAX_ACTIVITY_REGIONS,
  MAX_NICKNAME_LENGTH,
  type ActivityScope,
  type FoodFocus,
  type MyProfile,
  type ProfileChanges,
  type TasteTag,
} from "../../models/community";
import { AVOIDABLE_VISIT_CONDITIONS } from "../../models/place";
import { filterTagsForFocus } from "../../models/tasteTags";
import { errorMessage } from "../../utils/errorMessage";
import { useAvatarDraft } from "../../hooks/useAvatarDraft";
import { useCoverDraft } from "./useCoverDraft";
import { useRegionCatalog } from "../../hooks/useRegionCatalog";

/**
 * 프로필 편집의 네 화면(보드 15): 공개 프로필(15-01) · 배경 사진(15-02) · 공개 스타일 태그(15-03) · 추천 취향·제외 조건(15-04).
 * 주소 #profile-edit/<view>로 오가며, 한 폼(useProfileForm)을 함께 써서 어느 화면에서 저장해도 전부 한 번에 저장합니다.
 */
export type ProfileView = "profile" | "cover" | "style" | "taste";

/** 소개 최대 글자 수. 커뮤니티 서비스 ProfileModels.UpdateProfileRequest의 intro 검증과 같습니다. */
export const MAX_INTRO_LENGTH = 300;

/** 프로필 편집 화면의 입력 상태와 저장 동작입니다. 네 화면(ProfileView)이 한 폼을 함께 저장합니다. */
export function useProfileForm({
  accessToken,
  profile,
  options,
  onSave,
  onError,
}: {
  accessToken: string;
  profile: MyProfile;
  options: TasteTag[];
  onSave: (changes: ProfileChanges) => Promise<void>;
  onError: (message: string) => void;
}) {
  const { regions, hasCatalogError } = useRegionCatalog();
  const avatar = useAvatarDraft(onError);
  const cover = useCoverDraft(profile, onError);
  // 매장 이용(VISIT) 중 피할 만한 조건만 제외 태그로 고르게 하고, 나머지 분류는 소개·추천 취향에 씁니다.
  const positiveOptions = options.filter((tag) => tag.tagGroup !== "VISIT");
  const avoidOptions = options.filter(
    (tag) => tag.tagGroup === "VISIT" && AVOIDABLE_VISIT_CONDITIONS.some((condition) => condition === tag.name),
  );
  const [nickname, setNickname] = useState(profile.nickname);
  const [intro, setIntro] = useState(profile.intro ?? "");
  // 지금 내 닉네임은 묻지 않습니다. 겹치면 입력칸 아래에 알리고 저장을 막습니다(저장 요청도 서버에서 다시 확인).
  const nicknameCheck = useNicknameCheck(accessToken, nickname, profile.nickname);
  const [profileTags, setProfileTags] = useState(profile.profileTags);
  const [preferenceTags, setPreferenceTags] = useState(profile.preferenceTags);
  const [excludedTags, setExcludedTags] = useState(profile.excludedTags);
  const [tasterFocus, setTasterFocus] = useState<FoodFocus>(profile.tasterFocus);
  const [activityScope, setActivityScope] = useState<ActivityScope>(profile.activityScope);
  // 활동 지역(최대 MAX_ACTIVITY_REGIONS곳)은 법정동 공식 이름을 이은 한 줄씩입니다. 더하기는 RegionAddSheet가 합니다.
  const [activityRegions, setActivityRegions] = useState<string[]>(profile.activityRegions);
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>(profile.preferenceFocus);
  const [isSaving, setIsSaving] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

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
    // 여행 위주는 한 지역에 묶이지 않아 지역을 비웁니다(서버도 TRAVEL이면 저장하지 않음).
    if (scope === "TRAVEL") setActivityRegions([]);
  }

  /** 활동 지역 더하기: 같은 곳은 다시 넣지 않고 최대 MAX_ACTIVITY_REGIONS곳까지입니다. */
  function addActivityRegion(region: string) {
    setActivityRegions((current) =>
      current.includes(region) || current.length >= MAX_ACTIVITY_REGIONS ? current : [...current, region],
    );
  }
  function removeActivityRegion(region: string) {
    setActivityRegions((current) => current.filter((item) => item !== region));
  }

  /** 공개 스타일로는 추천 분야와 선호 태그만 복사하고, 제외 조건은 공개하지 않습니다. */
  function copyPreferenceToProfile() {
    setTasterFocus(preferenceFocus);
    setProfileTags(filterTagsForFocus(preferenceTags, preferenceFocus, positiveOptions));
    setCopyNotice("추천 취향을 가져왔어요. 확인한 뒤 저장을 눌러 주세요.");
  }

  /** 네 화면 어디서 눌러도 폼 전체를 저장합니다. 저장했으면 true라, 하위 화면은 저장 뒤 공개 프로필 화면으로 돌아갑니다. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault();
    if (!nickname.trim()) {
      onError("공개 프로필 화면에서 맛객 닉네임을 입력해 주세요.");
      return false;
    }
    if (nicknameCheck === "taken") {
      onError(`${NICKNAME_TAKEN_MESSAGE} 다른 이름을 정해 주세요.`);
      return false;
    }
    setIsSaving(true);
    try {
      await onSave({
        nickname: nickname.trim(),
        intro: intro.trim(),
        profileTags: filterTagsForFocus(profileTags, tasterFocus, positiveOptions),
        tasterFocus,
        activityScope,
        activityRegions: activityScope === "TRAVEL" ? [] : activityRegions,
        preferenceFocus,
        preferenceTags: filterTagsForFocus(preferenceTags, preferenceFocus, positiveOptions),
        // 사전에서 빠졌거나 이제 고를 수 없는 조건은 저장하지 않습니다(다른 태그와 같은 규칙).
        excludedTags: excludedTags.filter((tag) => avoidOptions.some((option) => option.name === tag)),
        avatarFile: avatar.file,
        coverFiles: cover.files,
        removedCoverPhotoIds: cover.removedPhotoIds,
        shouldRemoveAvatar: avatar.isRemoved,
      });
      avatar.reset();
      cover.reset();
      return true;
    } catch (cause) {
      onError(errorMessage(cause, RETRY_LATER_MESSAGE));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    profile,
    regions,
    hasCatalogError,
    avatar,
    cover,
    positiveOptions,
    avoidOptions,
    nickname,
    changeNickname,
    nicknameCheck,
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
    activityRegions,
    addActivityRegion,
    removeActivityRegion,
    copyNotice,
    copyPreferenceToProfile,
    isSaving,
    submit,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
