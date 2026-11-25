import { EmptyState } from "../components/ui";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import type { ProfileView } from "../screens/profile-edit/useProfileForm";
import { useAppData } from "./AppData";

const VIEWS: ProfileView[] = ["profile", "cover", "style", "taste"];

/**
 * 프로필 편집(#profile-edit, #profile-edit/cover|style|taste, 보드 15)입니다. 내 프로필을 받기 전에는 불러오는 중으로 보여줍니다.
 * 화면(App)은 같은 screen 안에서 주소만 바뀌면 이 부품을 그대로 두므로, 네 화면을 오가도 고치던 내용이 남습니다.
 */
export default function ProfileEditRoute({ routeId }: { routeId: string }) {
  const { myProfile } = useAppData();
  if (!myProfile) return <EmptyState tone="loading" title="프로필을 불러오고 있어요…" />;
  const view = VIEWS.find((item) => item === routeId) ?? "profile";
  return <ProfileSettingsScreen profile={myProfile} view={view} />;
}
