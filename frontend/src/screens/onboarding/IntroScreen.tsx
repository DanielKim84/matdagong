import { useEffect, useState, type ReactNode } from "react";
import Icon from "../../components/Icon";
import { useSwipe } from "../../hooks/useSwipe";
import { CleanMapVisual, EarningsVisual, NoisyReviewsVisual, PromiseVisual, TrustVisual } from "./IntroVisuals";

type Slide = {
  key: string;
  eyebrow: string;
  /** 제목 두 줄. <mark>로 감싼 부분이 강조 문구입니다. */
  title: [ReactNode, ReactNode];
  body: string;
  visual: ReactNode;
  tone: "brand" | "amber" | "green";
};

const SLIDES: Slide[] = [
  {
    key: "noise",
    eyebrow: "맛집 찾기, 이제 그만 지치세요",
    title: [
      <>
        이 리뷰, <mark>광고</mark>일까?
      </>,
      <>
        <mark>협찬</mark>일까?
      </>,
    ],
    body: "후기 하나하나 진짜인지 확인하다 보면, 정작 고르는 건 늦어지고 결국 실패하기도 하죠.",
    visual: <NoisyReviewsVisual />,
    tone: "brand",
  },
  {
    key: "trust",
    eyebrow: "취향은 시작, 신뢰는 경험으로",
    title: [
      <>
        입맛 맞는 <mark>맛객</mark>,
      </>,
      <>
        가 볼수록 <mark>믿음</mark>이 쌓여요
      </>,
    ],
    body: "취향 %로 찾고, 그 맛객의 맛집에 다녀와 마음에 들면 기록으로, 별로였다면 ‘별로였어요’로 남기세요. 같은 맛집에서 입맛이 맞을수록 서로의 신뢰 %가 올라, 맛객도 한 곳 한 곳 신중하게 올려요.",
    visual: <TrustVisual />,
    tone: "green",
  },
  {
    key: "map",
    eyebrow: "검증은 맛객이, 고르기는 1초",
    title: [
      <>
        지도를 열면 <mark>진짜 기록</mark>만
      </>,
      <>바로 출발하세요</>,
    ],
    body: "발견 지도에는 광고 장소가 없어요. 믿는 맛객의 추천 이유와 메뉴를 보고 고민 없이 가면 돼요.",
    visual: <CleanMapVisual />,
    tone: "brand",
  },
  {
    key: "earn",
    eyebrow: "맛다공만의 특별함",
    title: [
      <>좋아하는 곳만 기록했는데</>,
      <>
        <mark>수익</mark>이 생겨요
      </>,
    ],
    body: "다니던 맛집·카페 중 마음에 드는 곳만 남기세요. 취향이 비슷한 사람들이 나를 구독하면, 유료 구독이 내 수익이 돼요.",
    visual: <EarningsVisual />,
    tone: "amber",
  },
  {
    key: "start",
    eyebrow: "광고 없는 맛집 지도, 맛다공",
    title: [
      <>
        오늘 갈 곳은 <mark>맛객</mark>에게,
      </>,
      <>내 기록은 수익으로</>,
    ],
    body: "취향을 알려 주면 잘 맞는 맛객부터 추천해 드려요.",
    visual: <PromiseVisual />,
    tone: "brand",
  },
];

/** 첫 실행(계정별 한 번)과 설정의 "맛다공 앱 소개"에서 보는 서비스 소개. 넘겨 보거나 건너뛰고 시작합니다. */
export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const move = (step: number) => setIndex((current) => Math.min(SLIDES.length - 1, Math.max(0, current + step)));
  const swipe = useSwipe({ onLeft: () => move(1), onRight: () => move(-1) });

  // 키보드 좌우 화살표로도 넘깁니다.
  useEffect(() => {
    const moveByArrow = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", moveByArrow);
    return () => window.removeEventListener("keydown", moveByArrow);
  }, []);

  const slide = SLIDES[index];

  return (
    <main
      className={`r-screen r-onboarding r-intro r-intro--${slide.tone}`}
      aria-roledescription="소개 카드"
      aria-label="맛다공 소개"
      {...swipe}
    >
      <header className="r-intro__top">
        <div className="r-intro__progress" aria-hidden="true">
          {SLIDES.map((item, dot) => (
            <span key={item.key} className={dot < index ? "is-done" : dot === index ? "is-on" : ""} />
          ))}
        </div>
        <div className="r-intro__bar">
          <span className="r-intro__brand r-display">맛다공</span>
          {!isLast && (
            <button type="button" className="r-onboarding-skip" onClick={onComplete}>
              건너뛰기
            </button>
          )}
        </div>
      </header>

      <span className="visually-hidden" aria-live="polite">{`${SLIDES.length}장 중 ${index + 1}장`}</span>
      <div className="r-intro__viewport">
        <div className="r-intro__track" style={{ transform: `translateX(${-index * 100}%)` }}>
          {SLIDES.map((item, position) => {
            const isCurrent = position === index;
            return (
              <section
                key={item.key}
                className="r-intro__slide"
                aria-hidden={!isCurrent}
                inert={!isCurrent}
                aria-label={`${SLIDES.length}장 중 ${position + 1}장`}
              >
                <div className="r-intro__stage">{item.visual}</div>
                <div className="r-intro__copy">
                  <span className="r-intro__eyebrow">{item.eyebrow}</span>
                  <h1 className="r-display">
                    {item.title[0]}
                    <br />
                    {item.title[1]}
                  </h1>
                  <p>{item.body}</p>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="r-onboarding-footer r-intro__footer">
        {index > 0 && (
          <button type="button" className="r-icon-button r-intro__back" onClick={() => move(-1)} aria-label="이전 소개">
            <Icon name="back" />
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
    </main>
  );
}
