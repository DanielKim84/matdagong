import { ScreenHeader } from "../components/AppChrome";
import { go } from "../app/navigation";
import Icon from "../components/Icon";

type Props = { onLogout: () => void };

export default function SettingsScreen({ onLogout }: Props) {
  return (
    <>
      <ScreenHeader title="설정" fallback="my" />
      <main className="settings-content">
        <button onClick={() => go("intro")}>
          <span>맛다공 앱 소개</span>
          <Icon name="chevron" />
        </button>
        <button className="settings-logout" onClick={onLogout}>
          <span>로그아웃</span>
          <Icon name="chevron" />
        </button>
      </main>
    </>
  );
}
