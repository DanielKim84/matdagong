import { useState } from "react";
import { go } from "../app/navigation";
import MascotArt from "./onboarding/MascotArt";
import { useSwipe } from "./onboarding/useSwipe";

const slides = [
  {
    pose: 1,
    art: "손을 흔드는 맛다공 캐릭터",
    title: ["오늘 뭐 먹지?", "맛객의 기록에서 골라요"],
    body: ["별점과 광고 문구 대신,", "직접 다녀온 사람의 추천 이유를 읽어요."],
  },
  {
    pose: 4,
    art: "하트를 만든 맛다공 캐릭터",
    title: ["내 입맛 아는 맛객을", "구독하면, 고민 끝"],
    body: ["광고 대신 직접 다녀온 사람의 기록으로", "오늘 갈 곳을 바로 정해요."],
  },
  {
    pose: 6,
    art: "메뉴판을 든 맛다공 캐릭터",
    title: ["바쁠 땐 장소만 먼저,", "기록은 나중에"],
    body: ["가게에서 빠르게 저장해 두고", "시간 날 때 메뉴와 사진을 더해 완성해요."],
  },
] as const;

/** 첫 실행 때 서비스 소개 카드를 넘겨 보고 시작하게 합니다. */
export default function IntroScreen({ onComplete }: { onComplete?: () => void }) {
  const [index, setIndex] = useState(0);
  const finish = () => (onComplete ? onComplete() : go("home"));
  const last = index === slides.length - 1;
  const next = () => (last ? finish() : setIndex(index + 1));
  const swipe = useSwipe(
    () => setIndex((current) => Math.min(slides.length - 1, current + 1)),
    () => setIndex((current) => Math.max(0, current - 1)),
  );
  const slide = slides[index];

  return (
    <main className="r-screen r-onboarding r-onboarding-intro" aria-roledescription="소개 카드" {...swipe}>
      <div className="r-onboarding-intro__hero" aria-hidden="true" />
      {!last && (
        <button type="button" className="r-onboarding-skip r-onboarding-intro__skip" onClick={finish}>
          건너뛰기
        </button>
      )}
      <div className="r-onboarding-intro__art" key={`art-${index}`}>
        <MascotArt pose={slide.pose} label={slide.art} />
      </div>
      <section className="r-onboarding-intro__copy" key={`copy-${index}`} aria-live="polite">
        <div className="r-onboarding-dots" aria-hidden="true">
          {slides.map((item, dot) => (
            <span key={item.pose} className={dot === index ? "is-on" : ""} />
          ))}
        </div>
        <span className="visually-hidden">{`${slides.length}장 중 ${index + 1}장`}</span>
        <h1 className="r-display">{slide.title[0]}<br />{slide.title[1]}</h1>
        <p className="r-muted">{slide.body[0]}<br />{slide.body[1]}</p>
      </section>
      <div className="r-onboarding-footer">
        <button type="button" className="r-button r-button--primary r-button--block" onClick={next}>
          {last ? "시작하기" : "다음"}
        </button>
      </div>
    </main>
  );
}
