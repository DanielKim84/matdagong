import { ScreenHeader } from "../components/AppChrome";
import { go } from "../app/navigation";
import Icon from "../components/Icon";

export default function SettingsScreen() {
  return (
    <>
      <ScreenHeader title="설정" />
      <main className="settings-content">
        <button onClick={() => go("intro")}>
          <span>맛다공 앱 소개</span>
          <Icon name="chevron" />
        </button>
        <button onClick={() => go("login")}>
          <span>로그인 화면</span>
          <Icon name="chevron" />
        </button>
        <div>
          <b>현재 체험 기능</b>
          <p>맛집 탐색, 지도, 스크랩, 구독, 맛집 등록</p>
          <small>
            맛집 정보는 장소 API로 조회합니다. 등록·스크랩·구독은 이 브라우저에
            저장돼요. 로그인, 다른 사용자에게 공유, 광고 집행과 포인트 거래는
            아직 연결되지 않았어요.
          </small>
        </div>
      </main>
    </>
  );
}
