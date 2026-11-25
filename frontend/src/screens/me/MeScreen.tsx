import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon, { type IconName } from "../../components/Icon";
import { formatNumber } from "../../utils/format";
import { MY_PLACE_CATEGORY_LABELS, type MyPlaceCategory } from "../mymap/myMapModel";
import { dayKey, isSameMonth, WEEKDAYS } from "./diary";
import { useMyPlaceEntries } from "./myPlaceCollection";
import { useDiaryEntries } from "./useDiaryEntries";

type MeLink = { icon: IconName; label: string; onClick: () => void };

/** 숫자 카드 세 칸: 내 지도·내 맛집 모음과 같은 세 갈래(가볼 곳 · 가본 곳 · 공유 중)와 같은 아이콘·색입니다. */
const STAT_CARDS: { category: MyPlaceCategory; icon: IconName }[] = [
  { category: "wish", icon: "heart" },
  { category: "visited", icon: "paw" },
  { category: "shared", icon: "shared" },
];

/** 바로 가기 다섯 줄(보드 13-01). 포인트 지갑은 포인트 서버를 붙이기 전까지 "준비 중" 화면입니다. 나를 구독한 사람은 내가 구독한 맛객 화면, 공유 범위는 내 맛집 모음에서 엽니다. */
const LINKS: MeLink[] = [
  { icon: "people", label: "내가 구독한 맛객", onClick: () => go("subscriptions") },
  { icon: "clock", label: "최근 본 곳", onClick: () => go("recent") },
  { icon: "pin", label: "빠른 장소 기록", onClick: () => go("drafts") },
  // 하트를 풀며 별로였어요를 고른 곳은 지도에서 빠지므로, 잘못 고른 곳을 되돌릴 수 있게 둡니다.
  { icon: "pin-off", label: "별로였던 곳", onClick: () => go("disliked") },
  { icon: "coins", label: "포인트 지갑", onClick: () => go("wallet") },
];

/**
 * 나 탭(#my, 보드 13-01): 프로필 머리(큰 사진 · "나의 맛다공"과 설명 · 프로필 편집 · 공개 프로필, 오른쪽 위 설정),
 * 가볼 곳 · 가본 곳 · 공유 중 흰 숫자 카드 세 칸(누르면 내 맛집 모음의 그 칩), 바로 가기 다섯 줄, 이번 주 기록 달력 순서입니다.
 */
export default function MeScreen() {
  const app = useAppData();
  const entries = useDiaryEntries();
  const places = useMyPlaceEntries();

  return (
    <main className="r-screen r-me">
      <header className="r-me-head">
        <button type="button" className="r-me-head__avatar" onClick={() => go("profile-edit")} aria-label="프로필 편집">
          <Avatar
            src={app.myProfile?.profileImgUrl ?? null}
            name={app.nickname}
            variant={app.myProfile?.avatarVariant ?? 1}
          />
        </button>
        <div className="r-me-head__copy">
          <h1 className="r-display">나의 맛다공</h1>
          <p>
            내가 가본 맛집과
            <br />
            가고 싶은 곳을 기록해요.
          </p>
          <div className="r-me-head__actions">
            <button type="button" className="r-me-head__action" onClick={() => go("profile-edit")}>
              <Icon name="pencil" />
              프로필 편집
            </button>
            {app.myProfile && (
              <button
                type="button"
                className="r-me-head__action"
                onClick={() => go("profile", app.myProfile?.accountId)}
              >
                <Icon name="user" />
                공개 프로필
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          className="r-icon-button r-me-head__settings"
          onClick={() => go("settings")}
          aria-label="설정"
        >
          <Icon name="settings" />
        </button>
      </header>

      {app.myProfile?.hiddenByReports && (
        <p className="r-me-hidden-notice" role="status">
          <b>신고가 쌓여 내 프로필이 임시로 가려졌어요.</b>
          다른 맛객에게 내 프로필과 기록이 보이지 않고, 새 기록을 남길 수 없어요. 운영팀이 확인한 뒤 다시 알려 드릴게요.
        </p>
      )}

      <div className="r-me-body">
        <ul className="r-me-stats">
          {STAT_CARDS.map((card) => (
            <li key={card.category}>
              <button type="button" className={`is-${card.category}`} onClick={() => go("saved", card.category)}>
                <Icon name={card.icon} filled={card.icon === "heart"} />
                <b>{MY_PLACE_CATEGORY_LABELS[card.category]}</b>
                <span>
                  {formatNumber(places.filter((entry) => entry.group === card.category).length)}곳
                  <Icon name="chevron" />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <ul className="r-me-links">
          {LINKS.map((link) => (
            <li key={link.label}>
              <button type="button" onClick={link.onClick}>
                <Icon name={link.icon} />
                <b>{link.label}</b>
                <Icon name="chevron" />
              </button>
            </li>
          ))}
        </ul>

        <WeekDiary dates={entries.map((entry) => entry.date)} />
      </div>
    </main>
  );
}

/** 보드 13-01의 "기록 달력": 이번 주 일~토와 기록한 날의 점. 누르면 맛집 다이어리(#diary)로 갑니다. */
function WeekDiary({ dates }: { dates: (Date | null)[] }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const days = Array.from(
    { length: 7 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
  const recorded = new Set(dates.filter((date): date is Date => !!date).map(dayKey));
  const monthCount = dates.filter((date) => date && isSameMonth(date, today.getFullYear(), today.getMonth())).length;
  const todayKey = dayKey(today);

  return (
    <button type="button" className="r-me-week" onClick={() => go("diary")}>
      <span className="r-me-week__head">
        <b>기록 달력</b>
        <small>이번 달 {monthCount}곳 기록</small>
        <Icon name="chevron" />
      </span>
      <span className="r-me-week__days" aria-hidden="true">
        {days.map((day) => (
          <span key={dayKey(day)} className={dayKey(day) === todayKey ? "is-today" : ""}>
            <small className={day.getDay() === 0 ? "is-sunday" : ""}>{WEEKDAYS[day.getDay()]}</small>
            <b>{day.getDate()}</b>
            <i className={recorded.has(dayKey(day)) ? "is-on" : ""} />
          </span>
        ))}
      </span>
    </button>
  );
}
