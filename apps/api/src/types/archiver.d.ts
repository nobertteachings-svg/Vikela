declare module "archiver" {
  import type { Readable } from "stream";

  interface Archiver extends Readable {
    append(source: string | Buffer | Readable, data: { name: string }): void;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    on(event: "error", listener: (err: Error) => void): this;
    finalize(): Promise<void>;
  }

  function archiver(
    format: string,
    options?: { zlib?: { level?: number } }
  ): Archiver;

  export default archiver;
}
