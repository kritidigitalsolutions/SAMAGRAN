import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

const MENU_GAP = 8;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function TableMenuPopover({
  open,
  anchorRect,
  preferUp = false,
  onClose,
  className = "",
  children,
}) {
  const positionStyle = useMemo(() => {
    if (!anchorRect) return null;

    const leftEdge = clamp(anchorRect.right, 12, window.innerWidth - 12);
    const baseTop = preferUp
      ? anchorRect.top - MENU_GAP
      : anchorRect.bottom + MENU_GAP;

    const safeTop = clamp(baseTop, 12, window.innerHeight - 12);

    return {
      left: `${leftEdge}px`,
      top: `${safeTop}px`,
      transform: preferUp ? "translate(-100%, -100%)" : "translateX(-100%)",
    };
  }, [anchorRect, preferUp]);

  useEffect(() => {
    if (!open) return undefined;

    const handleScroll = () => {
      if (onClose) onClose();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, onClose]);

  if (!open || !positionStyle) return null;

  return createPortal(
    <div
      className={`table-menu-popover ${className}`}
      style={positionStyle}
      data-table-menu-popover
    >
      {children}
    </div>,
    document.body
  );
}
