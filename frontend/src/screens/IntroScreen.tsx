import { go } from "../app/navigation";
import { Avatar, BrandArt, FoodPhoto } from "../components/BrandAssets";
import Icon from "../components/Icon";

/** 서비스 소개와 첫 가입 안내가 맛객 기록에서 구독까지의 핵심 가치를 보여줍니다. */
export default function IntroScreen({ onComplete }: { onComplete?: () => void }) {
  const finish = () => onComplete ? onComplete() : go("home");

  return (
    <main className="intro-screen intro-story">
      <header className="intro-story-header">
        <BrandArt name="logo" label="맛다공" />
        <span>맛객의 기록으로, 오늘의 한 끼를 쉽게</span>
        <button type="button" onClick={finish}>건너뛰기</button>
      </header>

      <section className="intro-story-hero">
        <div className="intro-story-copy">
          <span className="intro-story-kicker"><Icon name="sparkle" /> 맛다공이 만드는 새로운 선택</span>
          <h1>오늘 뭐 먹지?<br /><em>내가 믿는 맛객</em>의 기록에서 골라요</h1>
          <p>별점과 광고 문구를 더 찾기보다,<br />내 입맛을 아는 사람의 경험을 구독해요.</p>
        </div>
        <div className="intro-story-collage" aria-label="맛객의 기록을 보고 맛집을 고르는 모습">
          <div className="intro-story-food"><FoodPhoto index={1} /><span><Icon name="book" /> 같은 식당, 다른 기록</span></div>
          <div className="intro-story-mascot"><Avatar name="맛다공 셰프" variant={2} /></div>
          <div className="intro-story-pin"><BrandArt name="redPin" /></div>
          <span className="intro-story-sticker">내 취향<br />발견!</span>
        </div>
      </section>

      <section className="intro-story-chapter intro-story-record">
        <div className="intro-story-chapter-art"><BrandArt name="discover" /><span className="intro-story-art-orbit"><Icon name="fork" /></span></div>
        <div><small>01 · 직접 다녀온 기록</small><h2>맛객마다 다른<br />추천 이유를 읽어요</h2><p>같은 장소도 누구는 메뉴를, 누구는 분위기를 추천해요. 메뉴와 방문 팁까지 살펴보고 나와 맞는 기록을 골라요.</p></div>
      </section>

      <section className="intro-story-chapter intro-story-map-chapter">
        <div><small>02 · 내 기준으로 찾기</small><h2>취향에 맞는 기록을<br />지도에서 발견해요</h2><p>지금 있는 곳이나 여행할 지역을 살펴보고, 구독한 맛객의 맛집과 내 기록을 한눈에 찾아요.</p></div>
        <div className="intro-story-map-art"><BrandArt name="map" /><i><Icon name="pin" /></i><i><Icon name="sparkle" /></i><i><Icon name="heart" /></i></div>
      </section>

      <section className="intro-story-chapter intro-story-subscribe">
        <div className="intro-story-chapter-art"><BrandArt name="subscribe" /><span className="intro-story-art-orbit"><Icon name="heart" filled /></span></div>
        <div><small>03 · 믿고 보는 맛객 구독</small><h2>마음에 드는 맛객을<br />구독하고 새 기록을 받아요</h2><p>한 명은 무료로 구독할 수 있고, 더 많은 맛객은 원하는 기간을 골라 구독해요.</p></div>
      </section>

      <section className="intro-story-reward">
        <div className="intro-story-reward-art"><BrandArt name="points" /><span>맛객 리워드</span></div>
        <div><small>기록을 나누는 사람에게도 가치 있게</small><h2>맛객의 경험이<br />다른 사람의 선택을 도와요</h2><p>맛집 기록이 구독으로 이어지면 맛객에게 리워드가 돌아가는 구조를 만들어요.</p></div>
      </section>

      <section className="intro-story-trust">
        <BrandArt name="ads" />
        <div><small>맛다공의 기준</small><h2>광고와 맛객의 기록을<br />분명히 구분해요</h2><p>광고 맛집은 광고라고 표시해, 내가 믿고 보는 기록을 스스로 고를 수 있어요.</p></div>
      </section>

      <section className="intro-story-flow" aria-label="맛다공 이용 흐름">
        <span><Avatar name="맛객" variant={1} /><b>경험을 기록</b></span><i><Icon name="chevron" /></i>
        <span><BrandArt name="map" /><b>취향을 발견</b></span><i><Icon name="chevron" /></i>
        <span><BrandArt name="subscribe" /><b>구독으로 응원</b></span>
      </section>

      <footer className="intro-story-footer">
        <p>오늘의 한 끼, 나와 입맛이 맞는 사람에게 물어보세요.</p>
        <button className="primary-button" type="button" onClick={finish}>맛다공 시작하기 <Icon name="chevron" /></button>
      </footer>
    </main>
  );
}
