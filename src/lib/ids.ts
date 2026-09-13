import { ulid } from "ulid";

export const newEpisodeId = () => `ep_${ulid()}`;
export const newPlaylistId = () => `pl_${ulid()}`;
export const newAssetId = () => `au_${ulid()}`;
export const nowIso = () => new Date().toISOString();
