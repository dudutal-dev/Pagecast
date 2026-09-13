import { describe, expect, it } from "vitest";
import { DOMAIN_IDS } from "@/lib/domains";
import {
  buildBookCard,
  DEFAULT_MOTIF,
  detectCardLang,
  PALETTES,
  wrapText,
} from "@/lib/svg/bookCard";

describe("wrapText", () => {
  it("wraps greedily and caps at 3 lines", () => {
    expect(wrapText("אדם מחפש משמעות", 16)).toEqual(["אדם מחפש משמעות"]);
    expect(wrapText("one two three four five six seven eight nine ten", 9)).toEqual([
      "one two",
      "three",
      "four five",
    ]);
  });
  it("returns [] for empty input", () => {
    expect(wrapText("   ", 10)).toEqual([]);
  });
});

describe("buildBookCard", () => {
  it("renders a card for every domain with its palette and motif", () => {
    for (const domain of DOMAIN_IDS) {
      const svg = buildBookCard({ title: "כותר", author: "מחבר", domain });
      const [bg, accent] = PALETTES[domain];
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain(`fill="${bg}"`);
      expect(svg).toContain(`stroke="${accent}"`);
      expect(svg).toContain("איור מקורי — לא הכריכה המקורית");
      expect(DEFAULT_MOTIF[domain]).toBeDefined();
    }
  });

  it("escapes XML in titles and authors", () => {
    const svg = buildBookCard({
      title: `<script>"x"</script>`,
      author: "A & B",
      domain: "science",
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("A &amp; B");
  });

  it("uses LTR layout and English footer for English cards", () => {
    const svg = buildBookCard({
      title: "Deep Work",
      author: "Cal Newport",
      domain: "productivity",
      lang: "en",
    });
    expect(svg).toContain('direction="ltr"');
    expect(svg).toContain("Original illustration");
    expect(svg).toContain("Inter");
  });

  it("shrinks the title font as lines grow", () => {
    const one = buildBookCard({ title: "קצר", author: "a", domain: "money" });
    const three = buildBookCard({
      title: "כותר ארוך מאוד שנפרש על פני שלוש שורות שלמות בכרטיס",
      author: "a",
      domain: "money",
    });
    expect(one).toContain('font-size="54"');
    expect(three).toContain('font-size="40"');
  });

  it("renders a subtitle when given", () => {
    const svg = buildBookCard({
      title: "t",
      author: "a",
      domain: "fiction",
      subtitle: "המסר במשפט אחד",
    });
    expect(svg).toContain("המסר במשפט אחד");
  });
});

describe("detectCardLang", () => {
  it("picks en for Latin titles and he otherwise", () => {
    expect(detectCardLang("Atomic Habits")).toBe("en");
    expect(detectCardLang("הרגלים אטומיים")).toBe("he");
    expect(detectCardLang("1984")).toBe("he");
  });
});
