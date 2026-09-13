import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/server/db/client";
import {
  createEpisode,
  deleteEpisode,
  getEpisode,
  listEpisodes,
  markStatus,
  saveProgress,
  updateEpisode,
} from "@/server/services/episodes";
import { getSettings, updateSettings } from "@/server/services/settings";
import { episodeInputSchema, libraryQuerySchema } from "@/lib/schemas/episode";
import frankl from "../../fixtures/episode.frankl.json";

const input = () => episodeInputSchema.parse(frankl);
const query = (q: Record<string, string> = {}) => libraryQuerySchema.parse(q);

beforeEach(() => {
  resetDbForTests();
});

describe("episodes service", () => {
  it("creates an episode with a generated card and default flags", () => {
    const r = createEpisode(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.id).toMatch(/^ep_/);
    expect(r.data.cardSvg).toContain("<svg");
    expect(r.data.cardSvg).toContain("#2E1F47"); // psychology palette
    expect(r.data.status).toBe("new");
    expect(r.data.takeawaysDone).toEqual([false, false, false]);
    expect(r.data.coverUrl).toBeUndefined();
  });

  it("lists cards with search, domain filter and sorting", () => {
    createEpisode(input());
    createEpisode({
      ...input(),
      title: "הרגלים אטומיים",
      author: "ג'יימס קליר",
      domain: "personal",
    });
    expect(listEpisodes(query())).toHaveLength(2);
    expect(listEpisodes(query({ q: "פרנקל" }))).toHaveLength(1);
    expect(listEpisodes(query({ domain: "personal" }))[0]?.title).toBe("הרגלים אטומיים");
    const byTitle = listEpisodes(query({ sort: "title" })).map((e) => e.title);
    expect(byTitle).toEqual([...byTitle].sort((a, b) => a.localeCompare(b, "he")));
    const card = listEpisodes(query())[0]!;
    expect(card.hasAudio).toBe(false);
    expect(card.positionSec).toBe(0);
  });

  it("returns NOT_FOUND for a missing id", () => {
    const r = getEpisode("ep_missing");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("patches fields and regenerates the card when identity changes", () => {
    const created = createEpisode(input());
    if (!created.ok) throw new Error("setup");
    const before = created.data.cardSvg;
    const same = updateEpisode(created.data.id, { notes: "הערה" });
    expect(same.ok && same.data.cardSvg).toBe(before);
    expect(same.ok && same.data.notes).toBe("הערה");
    const changed = updateEpisode(created.data.id, { domain: "money" });
    expect(changed.ok && changed.data.cardSvg).not.toBe(before);
    expect(changed.ok && changed.data.cardSvg).toContain("#173B2B");
  });

  it("keeps takeawaysDone aligned with takeaways", () => {
    const created = createEpisode(input());
    if (!created.ok) throw new Error("setup");
    const ticked = updateEpisode(created.data.id, { takeawaysDone: [true, false, true] });
    expect(ticked.ok && ticked.data.takeawaysDone).toEqual([true, false, true]);
    const shorter = updateEpisode(created.data.id, { takeaways: ["רק אחד"] });
    expect(shorter.ok && shorter.data.takeawaysDone).toEqual([true]);
  });

  it("derives status from progress and keeps done sticky", () => {
    const created = createEpisode(input());
    if (!created.ok) throw new Error("setup");
    const id = created.data.id;
    expect(saveProgress(id, 2, 360).ok && getEpisode(id).ok).toBe(true);
    expect((getEpisode(id) as { ok: true; data: { status: string } }).data.status).toBe(
      "new",
    );
    saveProgress(id, 120, 360);
    expect((getEpisode(id) as { ok: true; data: { status: string } }).data.status).toBe(
      "in_progress",
    );
    saveProgress(id, 359, 360);
    expect((getEpisode(id) as { ok: true; data: { status: string } }).data.status).toBe(
      "done",
    );
    saveProgress(id, 10, 360);
    expect((getEpisode(id) as { ok: true; data: { status: string } }).data.status).toBe(
      "done",
    );
    const reset = markStatus(id, "new");
    expect(reset.ok && reset.data.status).toBe("new");
    expect(
      (getEpisode(id) as { ok: true; data: { positionSec: number } }).data.positionSec,
    ).toBe(0);
  });

  it("deletes and reports NOT_FOUND on second delete", () => {
    const created = createEpisode(input());
    if (!created.ok) throw new Error("setup");
    expect(deleteEpisode(created.data.id).ok).toBe(true);
    expect(deleteEpisode(created.data.id).ok).toBe(false);
    expect(listEpisodes(query())).toHaveLength(0);
  });
});

describe("settings service", () => {
  it("creates defaults on first read and patches", () => {
    expect(getSettings().podcastName).toBe("Pagecast");
    const r = updateSettings({ hostName: "דודו", theme: "dark" });
    expect(r.ok && r.data.hostName).toBe("דודו");
    expect(getSettings().theme).toBe("dark");
    expect(getSettings().voiceSettings.stability).toBe(0.4);
  });
});
