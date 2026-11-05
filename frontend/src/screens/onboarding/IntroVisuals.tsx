import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import MascotArt from "../../components/MascotArt";

/*
 * 서비스 소개 화면의 장면 그림. 실제 앱 화면 캡처(public/assets/intro/)와 음식 사진(public/assets/sample-food/)으로
 * 만들어 광고 소재로도 쓸 수 있게 합니다. 숫자와 이름은 모두 예시이며, 화면에 "예시"로 표시합니다.
 * 앱 화면이 크게 바뀌면 캡처를 다시 찍어 같은 이름으로 바꿉니다(docs/ui/current-design.md 참고).
 */

const FOOD = "/assets/sample-food";
const SHOT = "/assets/intro";

/** 실제 앱 화면을 담은 휴대폰 틀. 아래쪽은 흐리게 잘라 장면 높이에 맞춥니다. */
function Phone({ src, className = "" }: { src: string; className?: string }) {
  return (
    <span className={`r-intro-phone ${className}`}>
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

/** 1. 광고·협찬 리뷰에 지친 장면: 그럴듯한 음식 사진마다 협찬·광고 꼬리표가 붙어 있습니다. */
export function NoisyReviewsVisual() {
  const reviews = [
    { photo: "spicy-seafood", badge: "협찬", title: "인생 맛집 발견!! 무조건 가세요" },
    { photo: "grilled-steak", badge: "광고", title: "웨이팅 필수 핫플 BEST 10" },
    { photo: "cafe-pastry", badge: "체험단", title: "사장님이 너무 친절하셨어요 ^^" },
  ];
  return (
    <div className="r-intro-visual r-intro-noise" aria-hidden="true">
      {reviews.map((review, index) => (
        <div key={review.title} className={`r-intro-noise__card r-intro-noise__card--${index + 1}`}>
          <img src={`${FOOD}/${review.photo}.jpg`} alt="" />
          <span className="r-intro-noise__copy">
            <span className="r-intro-noise__badge">{review.badge}</span>
            <b>{review.title}</b>
            <span className="r-intro-noise__stars">★★★★★</span>
          </span>
        </div>
      ))}
      <span className="r-intro-noise__question r-intro-noise__question--1">?</span>
      <span className="r-intro-noise__question r-intro-noise__question--2">?</span>
    </div>
  );
}

/** 2. 취향 %로 찾고, 그 맛객의 맛집을 직접 다녀와 입맛이 맞을수록 신뢰 %가 쌓이는 장면(실제 등급 이름 "믿고 가는 맛객"을 씀) */
export function TrustVisual() {
  const visits = [
    { photo: "korean-table", name: "정미소 밥상" },
    { photo: "spicy-chicken", name: "산동만두" },
    { photo: "pork-belly", name: "연남 숯불집" },
  ];
  return (
    <div className="r-intro-visual r-intro-trust" aria-hidden="true">
      <div className="r-intro-trust__card">
        <div className="r-intro-trust__head">
          <Avatar src="demo-avatar:1" name="면요리 탐험가" />
          <span className="r-intro-trust__who">
            <b>면요리 탐험가</b>
            <small>국수 · 만두 · 중식</small>
          </span>
          <span className="r-intro-trust__match">
            <small>취향</small>78%
          </span>
        </div>
        <p className="r-intro-trust__label">
          함께 다녀와 입맛이 맞았던 맛집 <em>예시</em>
        </p>
        <ul className="r-intro-trust__visits">
          {visits.map((visit) => (
            <li key={visit.name}>
              <img src={`${FOOD}/${visit.photo}.jpg`} alt="" />
              <span>{visit.name}</span>
              <span className="r-intro-trust__ok">
                <Icon name="check" /> 입맛 맞음
              </span>
            </li>
          ))}
        </ul>
        <div className="r-intro-trust__meter">
          <span>신뢰</span>
          <span className="r-intro-trust__bar">
            <span />
          </span>
          <b>92%</b>
        </div>
      </div>
      <span className="r-intro-trust__badge">
        <Icon name="star" filled /> 믿고 가는 맛객
      </span>
    </div>
  );
}

/** 3. 지도를 열면 구독한 맛객의 기록만 보이는 장면(실제 발견 화면) */
export function CleanMapVisual() {
  return (
    <div className="r-intro-visual r-intro-shot" aria-hidden="true">
      <Phone src={`${SHOT}/app-discover.jpg`} />
      <span className="r-intro-shot__chip r-intro-shot__chip--left">
        <Icon name="check" /> 광고 장소 0곳
      </span>
      <span className="r-intro-shot__chip r-intro-shot__chip--right">
        <Icon name="heart" filled /> 구독한 맛객 기록만
      </span>
    </div>
  );
}

/** 4. 좋아하는 곳만 기록했더니 유료 구독자가 생기고 수익이 쌓이는 장면(실제 구독 관리 화면 + 예시 숫자) */
export function EarningsVisual() {
  const bars = [28, 36, 44, 58, 70, 92];
  return (
    <div className="r-intro-visual r-intro-shot r-intro-earn" aria-hidden="true">
      <Phone src={`${SHOT}/app-subscribers.jpg`} className="r-intro-phone--tilt" />
      <div className="r-intro-earn__card">
        <div className="r-intro-earn__head">
          <span>이번 달 구독 수익</span>
          <em>예시</em>
        </div>
        <b className="r-intro-earn__amount">
          128,000<small>P</small>
        </b>
        <div className="r-intro-earn__bars">
          {bars.map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} className={index === bars.length - 1 ? "is-now" : ""} />
          ))}
        </div>
      </div>
      <div className="r-intro-earn__toast">
        <span className="r-intro-earn__star">
          <Icon name="star" filled />
        </span>
        <span>
          <b>새 유료 구독자</b>
          <small>취향 비슷한 분이 구독했어요</small>
        </span>
      </div>
    </div>
  );
}

/** 5. 정리 장면: 실제 앱 화면 두 장과 캐릭터 */
export function PromiseVisual() {
  return (
    <div className="r-intro-visual r-intro-shot r-intro-hero" aria-hidden="true">
      <Phone src={`${SHOT}/app-discover.jpg`} className="r-intro-phone--back" />
      <Phone src={`${SHOT}/app-place.jpg`} className="r-intro-phone--front" />
      <span className="r-intro-hero__mascot">
        <MascotArt pose={5} />
      </span>
    </div>
  );
}
