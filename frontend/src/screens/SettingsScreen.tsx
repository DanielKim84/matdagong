import { ScreenHeader } from "../components/AppChrome";
import { go } from "../app/navigation";
import Icon from "../components/Icon";

type Props = { onLogout: () => void };

export default function SettingsScreen({ onLogout }: Props) {
  return (
    <>
      <ScreenHeader title="설정" fallback="my" />
      <main className="settings-content">
        <section className="settings-group">
          <button onClick={() => go("intro")}>
            <span className="settings-row-icon"><Icon name="book" /></span>
            <span>맛다공 앱 소개</span>
            <Icon name="chevron" />
          </button>
        </section>
        <section className="settings-group">
          <button className="settings-logout" onClick={onLogout}>
            <span className="settings-row-icon"><Icon name="back" /></span>
            <span>로그아웃</span>
            <Icon name="chevron" />
          </button>
        </section>
      </main>
    </>
  );
}
