import { ScreenHeader } from "../components/AppChrome";
import { go } from "../app/navigation";
import Icon from "../components/Icon";

type Props = { onLogout: () => void };

export default function SettingsScreen({ onLogout }: Props) {
  return (
    <>
      <ScreenHeader title="설정" />
      <main className="settings-content">
        <button onClick={() => go("intro")}>
          <span>맛다공 앱 소개</span>
          <Icon name="chevron" />
        </button>
        <button className="settings-logout" onClick={onLogout}>
          <span>로그아웃</span>
          <Icon name="chevron" />
        </button>
        <div>
          <b>현재 체험 기능</b>
          <p>맛집 탐색, 지도, 스크랩, 구독, 맛집 등록</p>
          <small>
            맛집 정보는 서비스 API로 조회합니다. 등록·스크랩·구독 기록은 현재 이
            브라우저에 저장되며, 로그아웃해도 유지됩니다.
          </small>
        </div>
      </main>
    </>
  );
}
