import { useRef } from "react";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { IMAGE_ACCEPT } from "./profileImages";
import type { ProfileForm } from "./useProfileForm";

/** 프로필 사진 고르기와 기본 캐릭터로 되돌리기입니다. 실제 반영은 프로필 저장 때 합니다. */
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
    <section className="r-card profile-edit-avatar-section">
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
      <div>
        <b>나를 소개하는 사진</b>
        <small>맛객 목록과 내 프로필에 보여요.</small>
        <small>JPG, PNG, WEBP · 사진당 5MB 이하</small>
      </div>
      {hasAvatar && (
        <button className="text-action" type="button" onClick={() => void resetToCharacter()}>
          기본 캐릭터
        </button>
      )}
    </section>
  );
}
