import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon, { type IconName } from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import SubScreen from "../../components/SubScreen";
import { Skeleton, TopBar } from "../../components/ui";
import { cancelMembership } from "../../services/auth";
import { deleteMyCommunityData } from "../../services/community";
import { deleteMyPlaceData } from "../../services/places";
import type { NotificationSettings } from "../../models/community";
import { LOGIN_PROVIDERS } from "../../models/loginProviders";
import { errorMessage } from "../../utils/errorMessage";
import { useNotificationSettings } from "./useNotificationSettings";

// code는 인증 서버가 알려 주는 소셜 제공자 코드입니다. 공통 로그인 화면(dagong-auth LoginPage)과 같은 제공자만 둡니다.
// Apple은 아이폰 앱을 출시할 때 iOS에서만 붙일 예정이라 지금은 두지 않습니다.

// 알림 줄의 왼쪽 코랄 아이콘(보드 17-02: 새 기록 연필 · 새 구독자 사람들 · 서비스 소식 확성기)
const NOTIFICATION_OPTIONS: { key: keyof NotificationSettings; label: string; description: string; icon: IconName }[] =
  [
    {
      key: "tasterNewPlace",
      label: "새 기록",
      description: "구독한 맛객이 새 맛집을 공개하면 알려드려요.",
      icon: "pencil",
    },
    { key: "newSubscriber", label: "새 구독자", description: "새로운 구독자가 생기면 알려드려요.", icon: "people" },
    {
      key: "serviceNews",
      label: "서비스 소식",
      description: "맛다공의 새로운 기능과 중요한 소식을 알려드려요.",
      icon: "megaphone",
    },
  ];

/**
 * 설정(#settings, 보드 17-01): 뒤로 옆 "설정", 내 프로필 줄("나의 맛다공"), 연결 계정(카카오·네이버 아이콘과 연결됨 알약),
 * 바로 가기 줄(프로필 정보 · 알림 설정 · 이용약관·개인정보 · 맛다공 앱 소개), 코랄 로그아웃, 맨 아래 작은 "맛다공 탈퇴".
 * 알림 설정은 알림 수신 설정 화면(17-02), 탈퇴는 탈퇴 확인 화면(18-04)을 전체 화면으로 엽니다.
 * 바로 가기 줄은 나 탭(MeScreen)의 줄(.r-me-links)과 같은 모양입니다.
 */
export default function AccountSettingsScreen() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const notificationSettings = useNotificationSettings();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [open, setOpen] = useState<"alerts" | "withdraw" | null>(null);

  const connectedLabel = LOGIN_PROVIDERS.filter((provider) => app.loginProviders.includes(provider.code))
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
   * 공통 계정(소셜 연결)은 다른 다공 서비스가 함께 쓰므로 남깁니다. 무엇이 지워지는지는 탈퇴 확인 화면(18-04)이 먼저 보여 줍니다.
   */
  async function withdraw() {
    if (isWithdrawing) return;
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

  const links: { icon: IconName; label: string; onClick: () => void }[] = [
    { icon: "user", label: "프로필 정보", onClick: () => go("profile-edit") },
    { icon: "bell", label: "알림 설정", onClick: () => setOpen("alerts") },
    { icon: "book", label: "이용약관 · 개인정보", onClick: () => go("policy", "terms") },
    { icon: "info", label: "맛다공 앱 소개", onClick: () => go("intro") },
  ];

  return (
    <main className="r-screen r-me-settings">
      <TopBar title="설정" fallback="my" aside={<span />} />
      <div className="r-me-body">
        <button type="button" className="r-me-settings__profile" onClick={() => go("profile-edit")}>
          <Avatar
            src={app.myProfile?.profileImgUrl ?? null}
            name={app.nickname}
            variant={app.myProfile?.avatarVariant ?? 1}
          />
          <span>
            <b className="r-display">나의 맛다공</b>
            <small>
              내가 가본 맛집과
              <br />
              가고 싶은 곳을 기록해요.
            </small>
          </span>
          <Icon name="chevron" />
        </button>

        <section className="r-me-group" aria-labelledby="r-me-settings-accounts">
          <h2 id="r-me-settings-accounts" className="r-me-group__title">
            연결 계정
          </h2>
          {/* 한 계정에 다른 소셜 계정을 더 잇는 기능은 아직 없어, 다른 제공자로 로그인하면 새 계정이 됩니다. */}
          <p className="r-me-settings__note">
            <Icon name="info" />
            다른 계정으로 로그인하면 별도 계정이에요.
          </p>
          <div className="r-me-list">
            {LOGIN_PROVIDERS.map((provider) => (
              <div className="r-row r-me-setting" key={provider.key}>
                <span className={`r-me-provider r-me-provider--${provider.key}`} aria-hidden="true">
                  {provider.mark}
                </span>
                <span className="r-me-setting__label">{provider.label} 계정</span>
                {app.loginProviders.includes(provider.code) ? (
                  <span className="r-me-setting__state is-ok">연결됨</span>
                ) : (
                  <span className="r-me-setting__state">연결 안 됨</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <ul className="r-me-links">
          {links.map((link) => (
            <li key={link.label}>
              <button type="button" onClick={link.onClick}>
                <Icon name={link.icon} />
                <b>{link.label}</b>
                <Icon name="chevron" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="r-me-links__danger" onClick={() => void logout()}>
              <Icon name="logout" />
              <b>로그아웃</b>
            </button>
          </li>
        </ul>
        {/* 탈퇴는 되돌릴 수 없어 목록 밖 아래에 작은 글자 버튼으로 둡니다. */}
        <button type="button" className="r-me-withdraw" onClick={() => setOpen("withdraw")}>
          맛다공 탈퇴
        </button>
      </div>

      {open === "alerts" && (
        <SubScreen title="알림 수신 설정" onClose={() => setOpen(null)} className="r-me-alerts">
          <p className="r-me-alerts__notice">
            <Icon name="bell" />
            <span>
              <b>원하는 알림을 선택해 받아보세요.</b>
              꺼진 종류는 서버에서 알림을 만들지 않습니다.
            </span>
          </p>
          <div className="r-me-list">
            {notificationSettings.settings ? (
              NOTIFICATION_OPTIONS.map((option) => {
                const isOn = notificationSettings.settings?.[option.key] ?? false;
                return (
                  <div className="r-row r-me-setting r-me-setting--alert" key={option.key}>
                    <Icon name={option.icon} />
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
          </div>
        </SubScreen>
      )}
      {open === "withdraw" && (
        <SubScreen
          title="맛다공 탈퇴"
          onClose={() => setOpen(null)}
          className="r-me-withdraw-screen"
          footer={
            <>
              <button type="button" className="r-button r-button--secondary" onClick={() => setOpen(null)}>
                취소
              </button>
              <button
                type="button"
                className="r-button r-button--primary"
                disabled={isWithdrawing}
                onClick={() => void withdraw()}
              >
                {isWithdrawing ? "탈퇴 처리 중…" : "탈퇴하기"}
              </button>
            </>
          }
        >
          <span className="r-me-withdraw-screen__mark" aria-hidden="true">
            <Icon name="user-x" />
          </span>
          <h2 className="r-me-withdraw-screen__title">맛다공을 탈퇴할까요?</h2>
          <p className="r-me-withdraw-screen__lead">
            탈퇴하면 맛다공에 저장한 모든 데이터가
            <br />
            삭제돼요. 이 작업은 되돌릴 수 없어요.
          </p>
          <section className="r-me-withdraw-screen__box is-danger" aria-label="삭제되는 데이터">
            <b>
              <Icon name="trash" />
              삭제되는 데이터
            </b>
            <ul>
              <li>내가 작성한 모든 기록과 사진, 태그</li>
              <li>프로필 정보(소개, 프로필 사진 등)</li>
              <li>구독 정보(이용권, 혜택 등)</li>
            </ul>
          </section>
          <section className="r-me-withdraw-screen__box" aria-label="다공 공통 계정">
            <b>
              <Icon name="user" />
              다공 공통 계정은 남아요
            </b>
            <p>
              맛다공을 탈퇴해도 다공의 공통 계정은 삭제되지 않아요. 다른 다공 서비스는 지금처럼 계속 이용할 수 있어요.
            </p>
          </section>
        </SubScreen>
      )}
    </main>
  );
}
