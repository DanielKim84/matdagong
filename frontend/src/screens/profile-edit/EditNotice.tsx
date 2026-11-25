import Icon, { type IconName } from "../../components/Icon";

/**
 * 프로필 편집 화면 맨 위의 연한 코랄 안내 상자(보드 15): 이 화면 내용이 공개인지(지구본) 나만 보는지(자물쇠) 먼저 알립니다.
 * 공개 프로필 · 공개 스타일 태그 · 추천 취향 화면이 함께 씁니다.
 */
export default function EditNotice({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <div className="profile-edit-notice">
      <Icon name={icon} />
      <span>
        <b>{title}</b>
        <small>{message}</small>
      </span>
    </div>
  );
}
