import { EmptyState } from "../components/ui";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import { useAppData } from "./AppData";

/** 프로필 설정(#profile-edit, #profile-edit/taste)입니다. 내 프로필을 받기 전에는 불러오는 중으로 보여줍니다. */
export default function ProfileEditRoute({ routeId }: { routeId: string }) {
  const { myProfile } = useAppData();
  if (!myProfile) return <EmptyState tone="loading" title="프로필을 불러오고 있어요…" />;
  const initialTab = routeId === "taste" ? "taste" : "profile";
  return <ProfileSettingsScreen key={initialTab} profile={myProfile} initialTab={initialTab} />;
}
