import type { ComponentType } from "react";
import CollectionsScreen from "../screens/me/CollectionsScreen";
import AccountSettingsScreen from "../screens/me/AccountSettingsScreen";
import DiaryScreen from "../screens/me/DiaryScreen";
import DislikedPlacesScreen from "../screens/me/DislikedPlacesScreen";
import MeScreen from "../screens/me/MeScreen";
import PolicyScreen from "../screens/me/PolicyScreen";
import QuickDraftsScreen from "../screens/me/QuickDraftsScreen";
import WalletScreen from "../screens/me/WalletScreen";
import DiscoverScreen from "../screens/discover/DiscoverScreen";
import MyMapScreen from "../screens/mymap/MyMapScreen";
import FeedScreen from "../screens/feed/FeedScreen";
import NotificationsScreen from "../screens/feed/NotificationsScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import PlaceDetailScreen from "../screens/place/PlaceDetailScreen";
import RecordScreen from "../screens/record/RecordScreen";
import SubscriptionsManageScreen from "../screens/tasters/SubscriptionsManageScreen";
import TasterProfileScreen from "../screens/tasters/TasterProfileScreen";
import TastersScreen from "../screens/tasters/TastersScreen";
import type { Screen } from "../models/place";
import ProfileEditRoute from "./ProfileEditRoute";

/** 주소(#화면)별로 그릴 화면입니다. 모음 화면(saved·recent)은 CollectionsScreen 하나가 주소를 보고 나눠 그립니다. */
export const SCREEN_VIEWS: Record<Screen, ComponentType<{ routeId: string }>> = {
  home: DiscoverScreen,
  map: DiscoverScreen,
  mymap: MyMapScreen,
  feed: FeedScreen,
  register: RecordScreen,
  place: PlaceDetailScreen,
  profile: TasterProfileScreen,
  tasters: TastersScreen,
  "taster-recommendations": TastersScreen,
  subscriptions: SubscriptionsManageScreen,
  my: MeScreen,
  diary: DiaryScreen,
  wallet: WalletScreen,
  drafts: QuickDraftsScreen,
  disliked: DislikedPlacesScreen,
  notifications: NotificationsScreen,
  settings: AccountSettingsScreen,
  policy: PolicyScreen,
  intro: OnboardingScreen,
  "profile-edit": ProfileEditRoute,
  saved: CollectionsScreen,
  recent: CollectionsScreen,
};
