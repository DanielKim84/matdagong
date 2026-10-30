import { go } from "../../app/navigation";
import IntroScreen from "../IntroScreen";

/** 서비스 소개·온보딩(#intro). */
export default function OnboardingScreen() {
  return <IntroScreen onComplete={() => go("home", "", true)} />;
}
