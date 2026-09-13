import { describe, expect, it } from "vitest";
import {
  episodeInputSchema,
  episodePatchSchema,
  flattenIssues,
  libraryQuerySchema,
  unknownBookSchema,
} from "@/lib/schemas/episode";
import {
  settingsPatchSchema,
  settingsSchema,
  DEFAULT_SETTINGS,
} from "@/lib/schemas/settings";
import frankl from "../../fixtures/episode.frankl.json";

describe("episodeInputSchema", () => {
  it("accepts the Frankl fixture (the chat → app contract)", () => {
    const r = episodeInputSchema.safeParse(frankl);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.domain).toBe("psychology");
      expect(r.data.takeaways).toHaveLength(3);
    }
  });

  it("fills defaults for non-essential fields", () => {
    const r = episodeInputSchema.safeParse({
      title: "ספר",
      author: "מחבר",
      domain: "money",
      message: "מסר",
      summaryMd: "תקציר",
      script: "תסריט",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.kind).toBe("nonfiction");
      expect(r.data.takeaways).toEqual([]);
      expect(r.data.caveat).toBe("");
      expect(r.data.coverUrl).toBeUndefined();
    }
  });

  it("rejects missing essentials with Hebrew, field-keyed messages", () => {
    const r = episodeInputSchema.safeParse({ title: "", author: "x", domain: "nope" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = flattenIssues(r.error);
      const paths = issues.map((i) => i.path);
      expect(paths).toContain("title");
      expect(paths).toContain("domain");
      expect(paths).toContain("message");
      expect(issues.find((i) => i.path === "title")?.message).toBe("חסר כותר");
    }
  });

  it("treats empty coverUrl as absent and rejects non-http links", () => {
    const base = {
      title: "t",
      author: "a",
      domain: "fiction",
      message: "m",
      summaryMd: "s",
      script: "sc",
    };
    const empty = episodeInputSchema.safeParse({ ...base, coverUrl: "  " });
    expect(empty.success && empty.data.coverUrl).toBeUndefined();
    const bad = episodeInputSchema.safeParse({
      ...base,
      coverUrl: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
  });

  it("coerces year strings and ignores junk years instead of failing", () => {
    const base = {
      title: "t",
      author: "a",
      domain: "fiction",
      message: "m",
      summaryMd: "s",
      script: "sc",
    };
    expect(episodeInputSchema.parse({ ...base, year: "1946" }).year).toBe(1946);
    expect(episodeInputSchema.parse({ ...base, year: "unknown" }).year).toBeUndefined();
  });

  it("strips unknown keys (ids and timestamps from a pasted export)", () => {
    const r = episodeInputSchema.parse({
      ...frankl,
      id: "ep_x",
      createdAt: "2020",
      cardSvg: "<svg/>",
    });
    expect("id" in r).toBe(false);
    expect("cardSvg" in r).toBe(false);
  });
});

describe("episodePatchSchema", () => {
  it("rejects an empty patch", () => {
    expect(episodePatchSchema.safeParse({}).success).toBe(false);
  });
  it("allows toggling favorite alone", () => {
    expect(episodePatchSchema.safeParse({ favorite: true }).success).toBe(true);
  });
});

describe("unknownBookSchema", () => {
  it("recognises the LLM's unknown response", () => {
    expect(unknownBookSchema.safeParse({ unknown: true, reason: "x" }).success).toBe(
      true,
    );
    expect(unknownBookSchema.safeParse({ unknown: false }).success).toBe(false);
  });
});

describe("libraryQuerySchema", () => {
  it("defaults sort and parses favorite flag", () => {
    const q = libraryQuerySchema.parse({ favorite: "1" });
    expect(q.sort).toBe("newest");
    expect(q.favorite).toBe(true);
  });
});

describe("settings", () => {
  it("defaults are valid", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });
  it("rejects out-of-range voice settings", () => {
    const r = settingsPatchSchema.safeParse({
      voiceSettings: {
        stability: 2,
        similarityBoost: 0.5,
        style: 0.5,
        speakerBoost: true,
      },
    });
    expect(r.success).toBe(false);
  });
});
