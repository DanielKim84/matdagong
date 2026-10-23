export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  emoji: string;
  accentColor: string;
  visitedOn: string;
  recentNote: string;
  recordCount: number;
  tasters: Taster[];
}

export interface Taster {
  tasterId: string;
  tasterName: string;
  tag: string;
  avatar: string;
  avatarColor: string;
  note: string;
}

export type NewPlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  reason: string;
  menus: string[];
  tags: string[];
  photos: string[];
  visibility: "public" | "subscribers";
  createdAt: string;
};

export type MapKind = "other" | "subscribed" | "ad";
export type Screen =
  | "home"
  | "map"
  | "register"
  | "my"
  | "place"
  | "profile"
  | "notifications"
  | "diary"
  | "saved"
  | "subscriptions"
  | "settings"
  | "intro"
  | "login"
  | "reviews"
  | "liked"
  | "recent";
