import { useEffect, useState, type ReactNode } from "react";
import Icon from "../../components/Icon";
import { useSwipe } from "../../hooks/useSwipe";
import { PlaceCard, RecordCards, ReviewCards, TasterCard, VisitCards } from "./IntroCards";

type Slide = {
  key: string;
  /** 제목 줄들. <mark>로 감싼 부분이 강조색입니다. */
  title: ReactNode[];
  body: string[];
  /** 제목 아래 화면 폭 사진. width·height는 파일 크기로, 비율을 지켜 확대 없이 폭에 맞춥니다. */
  photo: { src: string; width: number; height: number };
  cards: ReactNode;
};

const PHOTO = "/assets/content/intro";

/**
 * 소개 다섯 쪽(H안 내용, 기준 그림 docs/ui/proposals/intro/H-flow-applied.png).
 * 사진은 H안 보드에서 쪽마다 사진이 보이던 영역을 잘라 낸 파일이라 구도(그릇이 한쪽으로 비킨 모습)가 H안과 같습니다.
 */
const SLIDES: Slide[] = [
  {
    key: "review",
    title: ["이 리뷰,", <mark key="ad">광고일까?</mark>, <mark key="sponsor">협찬일까?</mark>],
    body: ["맛다공은 헷갈리는 리뷰 속에서", "진짜 방문 후기를 찾아드려요."],
    photo: { src: `${PHOTO}/ramen.jpg`, width: 576, height: 372 },
    cards: <ReviewCards />,
  },
  {
    key: "taster",
    title: [
      "입맛 맞는",
      <>
        <mark>맛객</mark>을 찾아요
      </>,
    ],
    body: ["내 입맛과 비슷한 맛객을 찾아", "믿고 참고할 수 있어요."],
    photo: { src: `${PHOTO}/steak.jpg`, width: 576, height: 332 },
    cards: <TasterCard />,
  },
  {
    key: "trust",
    title: ["가볼수록", <mark key="trust">믿음이 쌓여요</mark>],
    body: ["맛객의 방문 후기를 보고, 직접 다녀온", "경험이 쌓일수록 더 믿을 수 있는 추천이 돼요."],
    photo: { src: `${PHOTO}/stew.jpg`, width: 576, height: 284 },
    cards: <VisitCards />,
  },
  {
    key: "map",
    title: [
      "지도에는",
      <>
        맛객의 <mark>진짜</mark>
      </>,
      <>
        <mark>기록</mark>만
      </>,
    ],
    body: ["내 주변 지도에서 맛객들이 실제로", "다녀온 진짜 방문 기록만 볼 수 있어요."],
    photo: { src: `${PHOTO}/map-records.jpg`, width: 576, height: 448 },
    cards: <PlaceCard />,
  },
  {
    key: "record",
    title: ["좋아하는 곳을", "기록하고", <mark key="earn">수익으로</mark>],
    body: ["내가 좋아하는 맛집을 기록하고,", "내 기록을 구독하는 팬들로부터", "구독 수익도 얻을 수 있어요."],
    photo: { src: `${PHOTO}/room.jpg`, width: 576, height: 216 },
    cards: <RecordCards />,
  },
];

/**
 * 첫 실행과 설정의 "맛다공 앱 소개"에서 함께 쓰는 서비스 소개입니다(H안 내용).
 * 쪽마다 큰 제목·설명 → 위아래가 흰 바탕에 녹는 화면 폭 사진 → 사진 아래쪽에 걸친 앱 모양 카드 → 점 → 버튼입니다.
 * 첫 쪽은 맨 위 자기 줄에 입체 가로 로고와 "건너뛰기 · 다음", 2쪽부터 뒤로 버튼과 "다음", 마지막 쪽은 "맛다공 시작하기"입니다.
 * 건너뛰기는 남은 쪽을 보지 않고 바로 시작합니다.
 */
export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const lastIndex = SLIDES.length - 1;
  const isFirst = index === 0;
  const isLast = index === lastIndex;
  const move = (step: number) => setIndex((current) => Math.min(lastIndex, Math.max(0, current + step)));
  const swipe = useSwipe({ onLeft: () => move(1), onRight: () => move(-1) });

  // 키보드 좌우 화살표로도 소개를 넘깁니다.
  useEffect(() => {
    const moveByArrow = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", moveByArrow);
    return () => window.removeEventListener("keydown", moveByArrow);
  }, []);

  return (
    <main className="r-screen r-onboarding r-intro" aria-label="맛다공 소개" {...swipe}>
      <header className={`r-intro__top ${isFirst ? "is-first" : ""}`}>
        {isFirst ? (
          <img className="r-intro__logo" src="/assets/brand/brand-logo.png" alt="맛다공" width="2172" height="724" />
        ) : (
          <button type="button" className="r-icon-button" onClick={() => move(-1)} aria-label="이전 소개">
            <Icon name="back" />
          </button>
        )}
      </header>

      <span className="visually-hidden" aria-live="polite">
        {`${SLIDES.length}장 중 ${index + 1}장`}
      </span>
      <div className="r-intro__viewport">
        <div className="r-intro__track" style={{ transform: `translateX(${-index * 100}%)` }}>
          {SLIDES.map((item, position) => {
            const isCurrent = position === index;
            return (
              <section
                key={item.key}
                className={`r-intro__slide r-intro__slide--${item.key}`}
                aria-hidden={!isCurrent}
                inert={!isCurrent}
                aria-label={`${SLIDES.length}장 중 ${position + 1}장`}
              >
                <div className="r-intro__copy">
                  <h1>
                    {item.title.map((line, lineIndex) => (
                      <span key={lineIndex}>{line}</span>
                    ))}
                  </h1>
                  <p>
                    {item.body.map((line, lineIndex) => (
                      <span key={lineIndex}>{line}</span>
                    ))}
                  </p>
                </div>
                <img
                  className="r-intro__photo"
                  src={item.photo.src}
                  alt=""
                  width={item.photo.width}
                  height={item.photo.height}
                />
                <div className="r-intro__cards" aria-hidden="true">
                  {item.cards}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="r-onboarding-footer r-intro__footer">
        <div className="r-intro__dots" aria-hidden="true">
          {SLIDES.map((item, dot) => (
            <span key={item.key} className={dot === index ? "is-on" : ""} />
          ))}
        </div>
        <div className="r-intro__actions">
          {isFirst && (
            <button type="button" className="r-button r-button--secondary" onClick={onComplete}>
              건너뛰기
            </button>
          )}
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            onClick={() => (isLast ? onComplete() : move(1))}
          >
            {isLast ? "맛다공 시작하기" : "다음"}
          </button>
        </div>
      </div>
    </main>
  );
}
