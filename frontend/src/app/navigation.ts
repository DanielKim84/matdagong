import { useEffect, useState } from "react";
import type { Screen } from "../models/place";

const screens: Screen[] = [
  "home",
  "map",
  "register",
  "my",
  "place",
  "profile",
  "notifications",
  "diary",
  "saved",
  "subscriptions",
  "settings",
  "intro",
  "reviews",
  "liked",
  "recent",
];

function currentRoute(): { screen: Screen; id: string } {
  const [screen, id = ""] = window.location.hash.replace("#", "").split("/");
  return {
    screen: screens.includes(screen as Screen) ? (screen as Screen) : "home",
    id: decodeURIComponent(id),
  };
}

export function go(screen: Screen, id = "") {
  window.location.hash = `${screen}${id ? `/${encodeURIComponent(id)}` : ""}`;
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    function update() {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
