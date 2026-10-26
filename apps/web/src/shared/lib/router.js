import { useCallback, useEffect, useState } from "react";
import { VIEW_TITLES } from "../config/constants.js";

function readRoute() {
  const value = location.hash.replace(/^#\/?/, "");
  return VIEW_TITLES[value] ? value : "overview";
}

export function useAppRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const listener = () => setRoute(readRoute());
    addEventListener("hashchange", listener);
    return () => removeEventListener("hashchange", listener);
  }, []);
  const navigate = useCallback((next) => {
    location.hash = `/${next}`;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return [route, navigate];
}
