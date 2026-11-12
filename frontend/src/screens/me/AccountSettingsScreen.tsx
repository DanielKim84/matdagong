import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { Skeleton, TopBar } from "../../components/ui";
import { cancelMembership } from "../../services/auth";
import { deleteMyCommunityData } from "../../services/community";
import { deleteMyPlaceData } from "../../services/places";
import type { NotificationSettings } from "../../models/community";
import { errorMessage } from "../../utils/errorMessage";
import { useNotificationSettings } from "./useNotificationSettings";

// code는 인증 서버가 알려 주는 소셜 제공자 코드입니다. 공통 로그인 화면(dagong-auth LoginPage)과 같은 제공자만 둡니다.
// Apple은 아이폰 앱을 출시할 때 iOS에서만 붙일 예정이라 지금은 두지 않습니다.
const PROVIDERS = [
  { key: "kakao", code: "KAKAO", label: "카카오", mark: "K" },
  { key: "naver", code: "NAVER", label: "네이버", mark: "N" },
] as const;

const NOTIFICATION_OPTIONS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: "tasterNewPlace", label: "구독 맛객의 새 기록", description: "구독한 맛객이 새 맛집을 공개하면 알려요" },
  { key: "newSubscriber", label: "새 구독자", description: "누군가 나를 구독하면 알려요" },
  { key: "serviceNews", label: "맛다공 소식·이벤트", description: "새 기능과 이벤트 소식을 받아요" },
];

/** 설정(#settings): 계정 연결, 알림, 프로필, 앱 정보, 로그아웃, 탈퇴. */
export default function AccountSettingsScreen() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const notificationSettings = useNotificationSettings();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 이전 인증 서버처럼 제공자를 알려 주지 않으면 카카오 하나로 봅니다(그때는 카카오만 있었음).
  const connectedCodes: readonly string[] = app.loginProviders.length > 0 ? app.loginProviders : ["KAKAO"];
  const connectedLabel = PROVIDERS.filter((provider) => connectedCodes.includes(provider.code))
    .map((provider) => provider.label)
    .join("·");

  async function logout() {
    const isConfirmed = await confirm({
      title: "로그아웃할까요?",
      message: `다시 이용하려면 ${connectedLabel}로 로그인해 주세요.`,
      confirmLabel: "로그아웃",
      tone: "warning",
    });
    if (isConfirmed) app.actions.logout();
  }

  /**
   * 맛다공 탈퇴: 장소 서비스 → 커뮤니티 서비스 → 공통 로그인의 맛다공 가입 정보 순서로 지운 뒤 로그아웃합니다.
   * 세 곳 모두 이미 지운 것을 다시 지워도 괜찮게 만들어, 중간에 실패하면 같은 버튼으로 다시 시도하면 됩니다.
   * 공통 계정(소셜 연결)은 다른 다공 서비스가 함께 쓰므로 남깁니다.
   */
  async function withdraw() {
    const isConfirmed = await confirm({
      title: "맛다공을 탈퇴할까요?",
      message: "남긴 기록과 사진, 프로필, 구독, 알림이 모두 지워지고 되돌릴 수 없어요.",
      detail: { label: "함께 지워지는 것", value: "맛집 기록·사진·하트, 프로필·취향, 구독·구독자, 알림, 포인트 내역" },
      confirmLabel: "탈퇴할게요",
      tone: "danger",
    });
    if (!isConfirmed || isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      await deleteMyPlaceData(app.accessToken);
      await deleteMyCommunityData(app.accessToken);
      await cancelMembership(app.accessToken);
    } catch (cause) {
      setIsWithdrawing(false);
      app.actions.notify({
        kind: "error",
        title: "탈퇴를 마치지 못했어요",
        message: errorMessage(cause, "잠시 후 다시 시도해 주세요. 이미 지운 정보는 다시 지워도 괜찮아요."),
      });
      return;
    }
    app.actions.logout();
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
                {connectedCodes.includes(provider.code) ? (
                  <span className="r-me-setting__state is-ok">연결됨</span>
                ) : (
                  // 한 계정에 다른 소셜 계정을 더 잇는 기능은 아직 없어, 다른 제공자로 로그인하면 새 계정이 됩니다.
                  <small className="r-me-setting__state">연결 안 됨</small>
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
            <button type="button" className="r-row r-me-setting" onClick={() => go("policy", "terms")}>
              <span className="r-me-setting__label">이용약관</span>
              <Icon name="chevron" />
            </button>
            <button type="button" className="r-row r-me-setting" onClick={() => go("policy", "privacy")}>
              <span className="r-me-setting__label">개인정보 처리방침</span>
              <Icon name="chevron" />
            </button>
            <button type="button" className="r-row r-me-setting" onClick={() => void logout()}>
              <span className="r-me-setting__label is-danger">로그아웃</span>
            </button>
          </div>
        </section>
        {/* 탈퇴는 되돌릴 수 없어 목록 밖 아래에 작은 글자 버튼으로 둡니다. */}
        <button type="button" className="r-me-withdraw" onClick={() => void withdraw()} disabled={isWithdrawing}>
          {isWithdrawing ? "탈퇴 처리 중…" : "맛다공 탈퇴"}
        </button>
      </div>
    </main>
  );
}
