import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { Skeleton, TopBar } from "../../components/ui";
import type { NotificationSettings } from "../../models/community";
import { useNotificationSettings } from "./useNotificationSettings";

const PROVIDERS = [
  { key: "kakao", label: "카카오", mark: "K", isConnected: true },
  { key: "naver", label: "네이버", mark: "N", isConnected: false },
  { key: "apple", label: "Apple", mark: "A", isConnected: false },
] as const;

const NOTIFICATION_OPTIONS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: "tasterNewPlace", label: "구독 맛객의 새 기록", description: "구독한 맛객이 새 맛집을 공개하면 알려요" },
  { key: "newSubscriber", label: "새 구독자", description: "누군가 나를 구독하면 알려요" },
  { key: "serviceNews", label: "맛다공 소식·이벤트", description: "새 기능과 이벤트 소식을 받아요" },
];

/** 설정(#settings): 계정 연결, 알림, 프로필, 앱 정보, 로그아웃. */
export default function AccountSettingsScreen() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const notificationSettings = useNotificationSettings();

  function notifyPending(title: string, message = "기능이 열리면 이곳에서 바로 설정할 수 있어요.") {
    app.actions.notify({ kind: "info", title, message });
  }

  async function logout() {
    const isConfirmed = await confirm({
      title: "로그아웃할까요?",
      message: "다시 이용하려면 카카오로 로그인해 주세요.",
      confirmLabel: "로그아웃",
      tone: "warning",
    });
    if (isConfirmed) app.actions.logout();
  }

  return (
    <main className="r-screen r-me-settings">
      <TopBar title="설정" fallback="my" />
      <div className="r-me-body">
        <section className="r-me-group" aria-labelledby="r-me-settings-accounts">
          <h2 id="r-me-settings-accounts" className="r-me-group__title">
            연결된 계정
          </h2>
          <div className="r-card r-me-list">
            {PROVIDERS.map((provider) => (
              <div className="r-row r-me-setting" key={provider.key}>
                <span className={`r-me-provider r-me-provider--${provider.key}`} aria-hidden="true">
                  {provider.mark}
                </span>
                <span className="r-me-setting__label">{provider.label}</span>
                {provider.isConnected ? (
                  <span className="r-me-setting__state is-ok">연결됨</span>
                ) : (
                  <button
                    type="button"
                    className="r-me-setting__action"
                    onClick={() =>
                      notifyPending(
                        `${provider.label} 연결은 준비 중이에요`,
                        "지금은 카카오 계정으로만 로그인할 수 있어요.",
                      )
                    }
                  >
                    준비 중
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="r-me-group" aria-labelledby="r-me-settings-alerts">
          <h2 id="r-me-settings-alerts" className="r-me-group__title">
            알림
          </h2>
          <div className="r-card r-me-list">
            {notificationSettings.settings ? (
              NOTIFICATION_OPTIONS.map((option) => {
                const isOn = notificationSettings.settings?.[option.key] ?? false;
                return (
                  <div className="r-row r-me-setting" key={option.key}>
                    <span className="r-row__copy">
                      <b>{option.label}</b>
                      <small>{option.description}</small>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      aria-label={option.label}
                      aria-busy={notificationSettings.savingKey === option.key}
                      disabled={!!notificationSettings.savingKey}
                      className={`r-me-switch ${isOn ? "is-on" : ""}`}
                      onClick={() => void notificationSettings.toggle(option.key)}
                    >
                      <span />
                    </button>
                  </div>
                );
              })
            ) : notificationSettings.error ? (
              <p className="r-row r-me-setting r-muted" role="alert">
                {notificationSettings.error}
              </p>
            ) : (
              <Skeleton shape="row" count={3} label="알림 설정을 불러오고 있어요…" />
            )}
            <button type="button" className="r-row r-me-setting" onClick={() => go("notifications")}>
              <span className="r-me-setting__label">받은 알림 보기</span>
              <Icon name="chevron" />
            </button>
          </div>
        </section>

        <section className="r-me-group" aria-labelledby="r-me-settings-profile">
          <h2 id="r-me-settings-profile" className="r-me-group__title">
            내 정보
          </h2>
          <div className="r-card r-me-list">
            <button type="button" className="r-row r-me-setting" onClick={() => go("profile-edit")}>
              <span className="r-me-setting__label">프로필 편집</span>
              <Icon name="chevron" />
            </button>
            <button type="button" className="r-row r-me-setting" onClick={() => go("profile-edit", "taste")}>
              <span className="r-me-setting__label">취향 다시 설정하기</span>
              <Icon name="chevron" />
            </button>
          </div>
        </section>

        <section className="r-me-group" aria-labelledby="r-me-settings-etc">
          <h2 id="r-me-settings-etc" className="r-me-group__title">
            기타
          </h2>
          <div className="r-card r-me-list">
            <button type="button" className="r-row r-me-setting" onClick={() => go("intro")}>
              <span className="r-me-setting__label">맛다공 앱 소개</span>
              <Icon name="chevron" />
            </button>
            <button
              type="button"
              className="r-row r-me-setting"
              onClick={() =>
                notifyPending("이용약관 화면은 준비 중이에요", "약관이 확정되면 이곳에서 확인할 수 있어요.")
              }
            >
              <span className="r-me-setting__label">이용약관 · 개인정보 처리방침</span>
              <small className="r-me-setting__state">준비 중</small>
            </button>
            <button type="button" className="r-row r-me-setting" onClick={() => void logout()}>
              <span className="r-me-setting__label is-danger">로그아웃</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
