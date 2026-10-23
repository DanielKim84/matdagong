import { useState } from "react";
import { go } from "../app/navigation";
import { BrandArt } from "../components/BrandAssets";

const steps = [
  {
    title: (
      <>
        맛객들의 진짜 맛집을
        <br />
        발견해보세요
      </>
    ),
    description: (
      <>
        내 구독 맛객들이 직접 등록한
        <br />
        솔직한 맛집을 한눈에!
      </>
    ),
    art: "discover",
  },
  {
    title: (
      <>
        지도에서 만나는
        <br />내 주변 맛집
      </>
    ),
    description: (
      <>
        지금, 내 주변 맛객들이
        <br />
        추천한 맛집을 지도에서 확인하세요.
      </>
    ),
    art: "map",
  },
  {
    title: (
      <>
        마음에 드는 맛객을
        <br />
        구독해 보세요
      </>
    ),
    description: (
      <>
        취향이 맞는 맛객을 구독하고
        <br />
        새로운 맛집을 발견하세요.
      </>
    ),
    art: "subscribe",
  },
  {
    title: (
      <>
        먹고, 공유하고
        <br />
        포인트를 쌓아요
      </>
    ),
    description: (
      <>
        맛집을 방문하고
        <br />
        좋아요, 스크랩, 리뷰를 남겨요.
      </>
    ),
    art: "points",
  },
  {
    title: (
      <>
        다양한 광고 맛집도
        <br />
        함께 만나보세요
      </>
    ),
    description: (
      <>
        주변에 맛객의 맛집이 없다면
        <br />
        검증된 광고 맛집도 추천해드려요.
      </>
    ),
    art: "ads",
  },
] as const;

export default function IntroScreen() {
  const [step, setStep] = useState(-1);
  if (step === -1)
    return (
      <main className="intro-screen welcome-screen">
        <div className="intro-brand">
          <h1>
            맛있는 순간을
            <br />
            함께하는 사람들
          </h1>
          <BrandArt name="logo" label="맛다공" />
        </div>
        <BrandArt name="welcome" className="welcome-chef" />
        <div className="welcome-bottom">
          <p>
            맛있는 걸 함께하는 공간
            <br />
            <b>맛다공</b>
          </p>
          <button className="primary-button" onClick={() => setStep(0)}>
            시작하기
          </button>
        </div>
      </main>
    );
  const content = steps[step];
  return (
    <main className="intro-screen onboarding">
      <button className="intro-skip" onClick={() => go("home")}>
        건너뛰기
      </button>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <BrandArt name={content.art} className="onboarding-art" />
      <div className="onboarding-bottom">
        <div
          className="pagination"
          aria-label={`안내 ${step + 1} / ${steps.length}`}
        >
          {steps.map((_, index) => (
            <button
              aria-label={`${index + 1}번째 안내`}
              key={index}
              className={index === step ? "active" : ""}
              onClick={() => setStep(index)}
            />
          ))}
        </div>
        <button
          className={
            step === steps.length - 1 ? "primary-button" : "outline-button"
          }
          onClick={() =>
            step === steps.length - 1 ? go("home") : setStep(step + 1)
          }
        >
          {step === steps.length - 1 ? "시작하기" : "다음"}
        </button>
      </div>
    </main>
  );
}
