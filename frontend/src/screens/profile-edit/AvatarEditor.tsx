import { useRef } from "react";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { IMAGE_ACCEPT, MAX_IMAGE_SIZE_LABEL } from "../../utils/profileImages";
import type { ProfileForm } from "./useProfileForm";

/** 프로필 사진 고르기와 기본 캐릭터로 되돌리기입니다(보드 15-01: 가운데 큰 사진, 오른쪽 아래 카메라). 실제 반영은 저장 때 합니다. */
export default function AvatarEditor({ form }: { form: ProfileForm }) {
  const { confirm } = useNotificationDialog();
  const { profile, avatar } = form;
  const input = useRef<HTMLInputElement>(null);
  const hasAvatar = Boolean(profile.profileImgUrl || avatar.file) && !avatar.isRemoved;

  async function resetToCharacter() {
    const isConfirmed = await confirm({
      title: "프로필 사진을 삭제할까요?",
      message: "등록한 프로필 사진이 삭제되고 기본 캐릭터로 바뀝니다.",
      confirmLabel: "삭제할게요",
      tone: "danger",
    });
    if (!isConfirmed) return;
    avatar.remove();
    if (input.current) input.current.value = "";
  }

  return (
    <section className="profile-edit-avatar-section">
      <button
        className="profile-edit-avatar-button"
        type="button"
        onClick={() => input.current?.click()}
        aria-label="프로필 사진 변경"
      >
        <Avatar
          src={avatar.preview ?? (avatar.isRemoved ? null : profile.profileImgUrl)}
          name={form.nickname || profile.nickname}
          variant={profile.avatarVariant}
        />
        <span>
          <Icon name="camera" />
        </span>
      </button>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={(event) => avatar.choose(event.target.files?.[0])}
      />
      <small>
        JPG, PNG, WEBP · {MAX_IMAGE_SIZE_LABEL} 이하
        {hasAvatar && (
          <>
            {" · "}
            <button className="text-action" type="button" onClick={() => void resetToCharacter()}>
              기본 캐릭터로 바꾸기
            </button>
          </>
        )}
      </small>
    </section>
  );
}
