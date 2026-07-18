import "server-only";

import { Socket } from "node:net";

/**
 * VirusScanAdapter (spec §6.7): local ClamAV for development, configurable
 * provider for production. Any result other than 'clean' keeps the upload in
 * hard quarantine — files are NEVER auto-approved when scanning is
 * unconfigured, unavailable, or times out; only an administrator can release
 * them manually.
 */
export type ScanResult = "clean" | "infected" | "unavailable";

export interface VirusScanAdapter {
  readonly name: string;
  scan(content: Uint8Array): Promise<ScanResult>;
}

/** Explicit no-scanner state: everything stays quarantined. */
export class UnconfiguredScanAdapter implements VirusScanAdapter {
  readonly name = "unconfigured";
  scan(): Promise<ScanResult> {
    return Promise.resolve("unavailable");
  }
}

/**
 * ClamAV clamd adapter using the INSTREAM protocol over TCP — dependency
 * free. Run locally with: docker run -p 3310:3310 clamav/clamav
 */
export class ClamAvAdapter implements VirusScanAdapter {
  readonly name = "clamav";

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs = 30_000,
  ) {}

  scan(content: Uint8Array): Promise<ScanResult> {
    return new Promise((resolve) => {
      const socket = new Socket();
      let response = "";
      let settled = false;

      const finish = (result: ScanResult) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(this.timeoutMs, () => finish("unavailable"));
      socket.on("error", () => finish("unavailable"));
      socket.on("data", (chunk) => {
        response += chunk.toString("utf8");
      });
      socket.on("close", () => {
        if (response.includes("OK")) return finish("clean");
        if (response.includes("FOUND")) return finish("infected");
        finish("unavailable");
      });

      socket.connect(this.port, this.host, () => {
        socket.write("zINSTREAM\0");
        const size = Buffer.alloc(4);
        size.writeUInt32BE(content.length, 0);
        socket.write(size);
        socket.write(Buffer.from(content));
        const terminator = Buffer.alloc(4);
        socket.write(terminator);
      });
    });
  }
}

export function getVirusScanner(): VirusScanAdapter {
  const provider = process.env.VIRUS_SCAN_PROVIDER;
  if (provider === "clamav") {
    return new ClamAvAdapter(
      process.env.CLAMAV_HOST ?? "127.0.0.1",
      Number(process.env.CLAMAV_PORT ?? 3310),
    );
  }
  return new UnconfiguredScanAdapter();
}
