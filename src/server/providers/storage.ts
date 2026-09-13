import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { AUDIO_DIR } from "@/server/db/client";

/**
 * Abstraction over where produced audio lives. `LocalFsStorage` now; a Blob/S3
 * implementation later for Vercel. Keys are POSIX-style relative paths
 * (`<episodeId>/<hash>.mp3`).
 */
export interface StorageProvider {
  readonly kind: "local-fs" | "blob";
  put(key: string, data: Buffer | Readable): Promise<{ sizeBytes: number }>;
  exists(key: string): Promise<boolean>;
  stat(key: string): Promise<{ sizeBytes: number } | null>;
  /** Returns a byte-range readable stream for HTTP Range responses. */
  readRange(key: string, start: number, end: number): Readable;
  remove(key: string): Promise<void>;
  /** Absolute path for tools (ffmpeg) that need a real file. Null for remote storage. */
  localPath(key: string): string | null;
}

export class LocalFsStorage implements StorageProvider {
  readonly kind = "local-fs" as const;
  constructor(private readonly root: string = AUDIO_DIR) {}

  private abs(key: string): string {
    const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const abs = path.resolve(this.root, normalized);
    if (!abs.startsWith(path.resolve(this.root)))
      throw new Error("storage key escapes root");
    return abs;
  }

  async put(key: string, data: Buffer | Readable): Promise<{ sizeBytes: number }> {
    const abs = this.abs(key);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    if (Buffer.isBuffer(data)) {
      await fsp.writeFile(abs, data);
      return { sizeBytes: data.byteLength };
    }
    await new Promise<void>((resolve, reject) => {
      const out = fs.createWriteStream(abs);
      data
        .pipe(out)
        .on("finish", () => resolve())
        .on("error", reject);
      data.on("error", reject);
    });
    const { size } = await fsp.stat(abs);
    return { sizeBytes: size };
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }

  async stat(key: string): Promise<{ sizeBytes: number } | null> {
    try {
      const { size } = await fsp.stat(this.abs(key));
      return { sizeBytes: size };
    } catch {
      return null;
    }
  }

  readRange(key: string, start: number, end: number): Readable {
    return fs.createReadStream(this.abs(key), { start, end });
  }

  async remove(key: string): Promise<void> {
    await fsp.rm(this.abs(key), { force: true });
    // Remove the now-empty episode folder, ignore errors.
    await fsp.rmdir(path.dirname(this.abs(key))).catch(() => undefined);
  }

  localPath(key: string): string {
    return this.abs(key);
  }
}
