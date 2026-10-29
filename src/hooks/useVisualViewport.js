import { useLayoutEffect, useState } from "react";

// Mobile keyboards can resize/pan the visual viewport without changing 100dvh.
export default function useVisualViewport() {
  const [viewport, setViewport] = useState(null);

  useLayoutEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const height = visualViewport?.height ?? window.innerHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;
      const bottom = Math.max(0, window.innerHeight - height - offsetTop);
      setViewport(previous => previous?.height === height && previous.offsetTop === offsetTop && previous.bottom === bottom
        ? previous : { height, offsetTop, bottom });
    };
    updateViewport();
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return viewport;
}
