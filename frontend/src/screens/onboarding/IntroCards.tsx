import Icon from "../../components/Icon";

/*
 * 서비스 소개(IntroScreen) 쪽마다 사진 아래에 겹쳐 두는 앱 모양 예시 카드입니다(H안 내용).
 * 사람·가게·숫자는 예시이고 그림으로만 쓰므로 IntroScreen이 읽기 도구에서 숨깁니다(aria-hidden).
 * 사진은 public/assets/content/intro/에 둔 H안 보드 잘라 낸 파일입니다(파일 목록은 assets README).
 * 모양과 문구는 기준 그림(docs/ui/proposals/intro/H-flow-applied.png)을 따르고, 앱 규칙만 다르게 둡니다:
 * 별점 없음(4쪽), 가본 곳·기록이라는 앱 이름(2쪽), 비공개 대신 "나만 보기"(5쪽), "수익화 방향 시안" 대신 준비 중 안내(5쪽).
 */
const PHOTO = "/assets/content/intro";

/** 1쪽: 광고·협찬 의심 글과 실제 방문 기록을 나란히 견줍니다. */
export function ReviewCards() {
  return (
    <>
      <div className="r-intro-card r-intro-review is-doubt">
        <img src={`${PHOTO}/thumb-ad.jpg`} alt="" />
        <span>
          <b>
            <i className="r-intro-who">
              <Icon name="user" />
            </i>
            광고·협찬 의심
          </b>
          <small>
            정말 최고예요!!
            <br />꼭 가보세요!
          </small>
        </span>
        <em>광고?</em>
      </div>
      <div className="r-intro-card r-intro-review">
        <img src={`${PHOTO}/thumb-real.jpg`} alt="" />
        <span>
          <b>
            <i className="r-intro-ok">
              <Icon name="check" />
            </i>
            실제 방문 기록
          </b>
          <small>
            직접 다녀왔어요!
            <br />
            맛도 분위기도 좋았어요.
          </small>
        </span>
      </div>
    </>
  );
}

/** 2쪽: 취향이 비슷한 맛객 한 명(얼굴 · 이름 · 가본 곳·기록 수 · 취향 칩)과 그 맛객이 고른 곳 세 장입니다. */
export function TasterCard() {
  return (
    <div className="r-intro-card r-intro-taster">
      <div className="r-intro-taster__head">
        <img src={`${PHOTO}/taster-minji.jpg`} alt="" />
        <span>
          <b>
            맛객 민지
            <i className="r-intro-ok">
              <Icon name="check" />
            </i>
          </b>
          <small>가본 곳 127곳 · 기록 98개</small>
        </span>
      </div>
      <div className="r-intro-taster__chips">
        <span>한식 러버</span>
        <span>매운맛 좋아요</span>
        <span>가성비 중시</span>
      </div>
      <div className="r-intro-line">
        <Icon name="people" />
        내 취향과 잘 맞는 맛객
        <Icon name="chevron" />
      </div>
      <div className="r-intro-taster__picks">
        <img src={`${PHOTO}/pick-1.jpg`} alt="" />
        <img src={`${PHOTO}/pick-2.jpg`} alt="" />
        <img src={`${PHOTO}/pick-3.jpg`} alt="" />
      </div>
    </div>
  );
}

const VISITS = [
  { label: "첫 방문", date: "2024.10.12", photo: "visit-1.jpg" },
  { label: "재방문", date: "2024.12.21", photo: "visit-2.jpg" },
  { label: "3번째 방문", date: "2025.01.24", photo: "visit-3.jpg" },
];

/** 3쪽: 왼쪽 세로 타임라인(앞 두 번은 빈 동그라미, 마지막은 코랄 체크)과 방문 줄, 코랄 방패 체크가 있는 신뢰 상자입니다. */
export function VisitCards() {
  return (
    <>
      <div className="r-intro-card r-intro-visits">
        {VISITS.map((visit, index) => (
          <div key={visit.label} className={`r-intro-visits__row ${index === VISITS.length - 1 ? "is-on" : ""}`}>
            <i className="r-intro-visits__dot">{index === VISITS.length - 1 && <Icon name="check" />}</i>
            <img src={`${PHOTO}/${visit.photo}`} alt="" />
            <span>
              <b>{visit.label}</b>
              <small>{visit.date}</small>
            </span>
            <Icon name="chevron" />
          </div>
        ))}
      </div>
      <div className="r-intro-trust">
        <ShieldCheck />
        <b>
          방문이 쌓일수록
          <br />더 신뢰할 수 있는 맛객!
        </b>
      </div>
    </>
  );
}

/** 4쪽: 지도에서 고른 가게 한 곳과 맛객 방문 기록 수입니다(별점은 앱 규칙대로 두지 않음). */
export function PlaceCard() {
  return (
    <div className="r-intro-card r-intro-place">
      <div className="r-intro-place__head">
        <img src={`${PHOTO}/place-yukmi.jpg`} alt="" />
        <span>
          <b>육미식당</b>
          <small>한식 · 350m · 연남동</small>
        </span>
        <Icon name="bookmark" />
      </div>
      <div className="r-intro-line">
        <i className="r-intro-ok">
          <Icon name="check" />
        </i>
        <span>
          맛객 방문 기록
          <small>직접 다녀온 기록 12건</small>
        </span>
        <Icon name="chevron" />
      </div>
    </div>
  );
}

/**
 * 5쪽: 연한 바탕 안 흰 줄 두 개로 된 공개 범위(공개 · 나만 보기)와 기록하기 → 구독자 → 구독 수익 흐름 카드,
 * 카드 아래 작은 회색 안내입니다. 유료 구독·정산은 아직 준비 중입니다.
 */
export function RecordCards() {
  return (
    <>
      <div className="r-intro-card r-intro-visibility">
        <div>
          <Icon name="globe" />
          <span>
            <b>공개</b>
            <small>누구나 볼 수 있어요</small>
          </span>
          <i className="is-on" />
        </div>
        <div>
          <Icon name="lock" />
          <span>
            <b>나만 보기</b>
            <small>나만 볼 수 있어요</small>
          </span>
          <i />
        </div>
      </div>
      <div className="r-intro-card r-intro-flow">
        <div>
          <span>
            <i>
              <Icon name="pencil" />
            </i>
            기록하기
          </span>
          <Icon name="chevron" />
          <span>
            <i>
              <Icon name="people" />
            </i>
            구독자
          </span>
          <Icon name="chevron" />
          <span>
            <i>
              <BarsIcon />
            </i>
            구독 수익
          </span>
        </div>
      </div>
      <small className="r-intro-soon">유료 구독과 정산은 준비 중이에요.</small>
    </>
  );
}

/** 신뢰 상자의 코랄 방패 안 흰 체크(아이콘 세트에 방패가 없어 이 카드에서만 그림) */
function ShieldCheck() {
  return (
    <svg className="r-intro-shield" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 4.5 5.4v5.9c0 4.7 3.1 8.8 7.5 10.2 4.4-1.4 7.5-5.5 7.5-10.2V5.4L12 2.5Z" />
      <path className="r-intro-shield__check" d="m8.3 12.2 2.6 2.6 4.9-5.2" />
    </svg>
  );
}

/** 구독 수익의 막대그래프(아이콘 세트에 없어 이 카드에서만 그림) */
function BarsIcon() {
  return (
    <svg className="r-intro-bars" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="13" width="4" height="7" rx="1.5" />
      <rect x="10" y="9" width="4" height="11" rx="1.5" />
      <rect x="16" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}
