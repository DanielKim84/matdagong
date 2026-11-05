import { go } from "../../app/navigation";
import IntroScreen from "./IntroScreen";

/** 설정의 "맛다공 앱 소개"(#intro)에서 다시 보는 서비스 소개입니다. 첫 실행 소개는 app/startupView가 띄웁니다. */
export default function OnboardingScreen() {
  return <IntroScreen onComplete={() => go("home", "", true)} />;
}
