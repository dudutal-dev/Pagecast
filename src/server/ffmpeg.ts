import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface FfmpegStatus {
  available: boolean;
  version: string | null;
  installHint: string;
}

const INSTALL_HINT =
  process.platform === "win32"
    ? "התקן עם: winget install ffmpeg  (ואז הפעל מחדש את השרת)"
    : process.platform === "darwin"
      ? "התקן עם: brew install ffmpeg"
      : "התקן עם: sudo apt install ffmpeg";

let cached: FfmpegStatus | null = null;

export async function detectFfmpeg(force = false): Promise<FfmpegStatus> {
  if (cached && !force) return cached;
  try {
    const { stdout } = await exec(process.env.FFMPEG_PATH ?? "ffmpeg", ["-version"]);
    const version =
      stdout
        .split("\n")[0]
        ?.replace(/^ffmpeg version\s*/i, "")
        .trim() ?? null;
    cached = { available: true, version, installHint: INSTALL_HINT };
  } catch {
    cached = { available: false, version: null, installHint: INSTALL_HINT };
  }
  return cached;
}

/** Losslessly concatenates MP3 parts (same codec/bitrate) into `outPath`. */
export async function concatMp3(parts: string[], outPath: string): Promise<void> {
  if (parts.length === 0) throw new Error("concatMp3: no parts");
  if (parts.length === 1) {
    await fs.copyFile(parts[0]!, outPath);
    return;
  }
  // The concat demuxer misreads Windows drive letters ("C:/…") as a protocol, so the
  // list uses file names relative to the parts' directory and ffmpeg runs from there.
  const dir = path.dirname(parts[0]!);
  const listPath = path.join(dir, `${path.basename(outPath)}.list.txt`);
  const list = parts
    .map((p) => `file '${path.basename(p).replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listPath, list, "utf8");
  try {
    await exec(
      process.env.FFMPEG_PATH ?? "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        path.basename(listPath),
        "-c",
        "copy",
        outPath,
      ],
      { cwd: dir },
    );
  } catch (e) {
    const err = e as Error & { stderr?: string };
    throw new Error(
      `ffmpeg concat failed: ${(err.stderr ?? err.message).trim().slice(0, 400)}`,
    );
  } finally {
    await fs.rm(listPath, { force: true });
  }
}

/** Reads duration in seconds with ffprobe if available; falls back to a bitrate estimate. */
export async function probeDurationSec(
  filePath: string,
  bitrateKbps = 128,
): Promise<number> {
  try {
    const { stdout } = await exec(process.env.FFPROBE_PATH ?? "ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const n = Number.parseFloat(stdout.trim());
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    // fall through
  }
  const { size } = await fs.stat(filePath);
  return (size * 8) / (bitrateKbps * 1000);
}

export const audioFileName = (hash: string) => `${hash}.mp3`;
export const audioRelPath = (episodeId: string, hash: string) =>
  path.posix.join(episodeId, audioFileName(hash));
