import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import useVisualViewport from "../hooks/useVisualViewport.js";

let openModals = 0;
let restoreScroll;

export default function ModalOverlay({ children, className = "", style, ...props }) {
  const viewport = useVisualViewport();
  useLayoutEffect(() => {
    if (openModals === 0) {
      const savedStyles = [document.documentElement, document.body].map((element) => ({
        element,
        properties: ["overflow", "overflow-x", "overflow-y"].map((name) => ({
          name,
          value: element.style.getPropertyValue(name),
          priority: element.style.getPropertyPriority(name),
        })),
      }));

      savedStyles.forEach(({ element }) => {
        element.style.setProperty("overflow", "hidden");
      });

      restoreScroll = () => savedStyles.forEach(({ element, properties }) => {
        element.style.removeProperty("overflow");
        properties.forEach(({ name, value, priority }) => {
          if (value) element.style.setProperty(name, value, priority);
        });
      });
    }
    openModals += 1;

    return () => {
      openModals -= 1;
      if (openModals === 0) restoreScroll();
    };
  }, []);

  // Keep fixed overlays outside ancestors with entrance transforms or clipping.
  return createPortal(
    <div {...props} className={`prompt-overlay ${className}`.trim()} style={{
      ...(viewport ? {
        "--modal-viewport-height": `${viewport.height}px`,
        "--modal-viewport-top": `${viewport.offsetTop}px`,
      } : {}),
      ...style,
    }}>{children}</div>,
    document.body,
  );
}
