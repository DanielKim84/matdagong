/** 프로필·사진 저장 API입니다. 가입과 프로필 편집이 같은 저장 흐름을 사용합니다. */
import type { ActivityScope, FoodFocus, MyProfile, ProfileChanges } from "../models/community";
import { communityRequest as request } from "./communityRequest";

/** 닉네임을 쓸 수 있는지 미리 묻습니다(지금 내 닉네임은 쓸 수 있음). 응답은 커뮤니티 서버 ProfileModels.NicknameAvailability입니다. */
export async function checkNicknameAvailable(
  accessToken: string,
  nickname: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await request<{ available: boolean }>(
    `/users/me/profile/nickname-availability?nickname=${encodeURIComponent(nickname)}`,
    accessToken,
    { signal },
  );
  return response.available;
}

export function ensureMyProfile(accessToken: string, nickname: string): Promise<MyProfile> {
  return request("/users/me/profile", accessToken, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

export function updateMyProfile(
  accessToken: string,
  profile: {
    nickname: string;
    intro: string;
    profileTags: string[];
    preferenceTags: string[];
    excludedTags: string[];
    tasterFocus: FoodFocus;
    preferenceFocus: FoodFocus;
    activityScope: ActivityScope;
    activityRegions: string[];
  },
): Promise<MyProfile> {
  return request("/users/me/profile", accessToken, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

/** 프로필 사진 한 장을 교체합니다(프로필 편집 저장, 가입 1단계에서 고른 사진). */
export async function uploadProfileImage(accessToken: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await request<void>("/users/me/profile/avatar", accessToken, {
    method: "PUT",
    body: form,
    errorMessage: "프로필 이미지를 저장하지 못했어요.",
  });
}

/** 배경 사진 여러 장을 기존 갤러리에 추가하고, 저장된 배경 사진 주소 목록을 돌려줍니다. */
async function uploadProfileCovers(accessToken: string, files: File[]): Promise<string[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return request<string[]>("/users/me/profile/covers", accessToken, {
    method: "POST",
    body: form,
    errorMessage: "배경 사진을 저장하지 못했어요.",
  });
}

/**
 * 가입할 때 카카오·네이버 프로필 사진을 맛객 프로필 사진으로 가져옵니다. 커뮤니티 서버가 그 주소에서 내려받아 저장하고,
 * 이미 프로필 사진이 있으면 그대로 둡니다(UserProfileController.importSocialAvatar).
 */
export async function importSocialAvatar(accessToken: string, imageUrl: string): Promise<void> {
  await request<void>("/users/me/profile/avatar/social", accessToken, {
    method: "PUT",
    body: JSON.stringify({ imageUrl }),
    errorMessage: "프로필 사진을 가져오지 못했어요.",
  });
}

async function removeProfileAvatar(accessToken: string): Promise<void> {
  await request<void>("/users/me/profile/avatar", accessToken, {
    method: "DELETE",
    errorMessage: "프로필 이미지를 삭제하지 못했어요.",
  });
}

async function removeProfileCoverPhoto(accessToken: string, photoId: string): Promise<void> {
  await request<void>(`/users/me/profile/covers/${encodeURIComponent(photoId)}`, accessToken, {
    method: "DELETE",
    errorMessage: "배경 사진을 삭제하지 못했어요.",
  });
}

/**
 * 프로필 설정 화면의 변경 내용을 순서대로 저장하고, 화면 상태에 바로 쓸 프로필을 돌려줍니다.
 * 사진 업로드 응답에는 프로필 전체가 없으므로 바뀐 사진 주소만 직접 맞춥니다. 주소 형식(/media/profiles/<계정>/avatar,
 * …/covers/<사진 ID>)은 커뮤니티 모듈 ProfileMediaUrls와 같게 둡니다.
 */
export async function saveMyProfile(accessToken: string, changes: ProfileChanges): Promise<MyProfile> {
  const savedProfile = await updateMyProfile(accessToken, {
    nickname: changes.nickname,
    intro: changes.intro,
    profileTags: changes.profileTags,
    preferenceTags: changes.preferenceTags,
    excludedTags: changes.excludedTags,
    tasterFocus: changes.tasterFocus,
    preferenceFocus: changes.preferenceFocus,
    activityScope: changes.activityScope,
    activityRegions: changes.activityRegions,
  });
  if (changes.avatarFile) await uploadProfileImage(accessToken, changes.avatarFile);
  else if (changes.shouldRemoveAvatar) await removeProfileAvatar(accessToken);
  for (const photoId of changes.removedCoverPhotoIds) {
    await removeProfileCoverPhoto(accessToken, photoId);
  }
  const savedCoverUrls = changes.coverFiles?.length
    ? await uploadProfileCovers(accessToken, changes.coverFiles)
    : undefined;
  const remainingCoverUrls = savedProfile.profileCoverUrls.filter(
    (url) => !changes.removedCoverPhotoIds.some((photoId) => url.includes(`/covers/${photoId}`)),
  );
  const updatedCoverUrls = savedCoverUrls ?? remainingCoverUrls;
  return {
    ...savedProfile,
    profileImgUrl: changes.shouldRemoveAvatar
      ? null
      : changes.avatarFile
        ? `/media/profiles/${savedProfile.accountId}/avatar`
        : savedProfile.profileImgUrl,
    profileCoverUrls: updatedCoverUrls,
  };
}
