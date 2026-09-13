import { useMemo } from "react";

/**
 * Inlines a book-card SVG so the page fonts (Heebo/Inter) apply and no network
 * request is needed. Gradient ids are namespaced per instance to avoid clashes
 * when many cards share a page.
 */
export function CardSvg({
  svg,
  uid,
  className = "",
}: {
  svg: string;
  uid: string;
  className?: string;
}) {
  const html = useMemo(() => {
    const safeUid = uid.replace(/[^A-Za-z0-9_-]/g, "");
    return svg
      .replace(/id="g"/g, `id="g-${safeUid}"`)
      .replace(/url\(#g\)/g, `url(#g-${safeUid})`);
  }, [svg, uid]);
  return (
    <div
      className={`card-svg ${className}`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
