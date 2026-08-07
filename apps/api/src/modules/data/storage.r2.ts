import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import path from "node:path";
import { env } from "../../config/env.js";
import {
  parseMonthlyFolder,
  parseQuarterlyFolder,
  periodFolder,
  periodSortKey,
  userFolder,
  userPeriodPrefix,
} from "./storage.paths.js";
import type { PeriodInput, PeriodFile, SavedCsv, StorageRepository } from "./storage.types.js";

function streamToBuffer(body: AsyncIterable<Uint8Array> | ReadableStream | Blob | undefined): Promise<Buffer> {
  if (!body) return Promise.resolve(Buffer.alloc(0));
  if (body instanceof Blob) return body.arrayBuffer().then((b) => Buffer.from(b));
  const chunks: Uint8Array[] = [];
  const iterable = body as AsyncIterable<Uint8Array>;
  return (async () => {
    for await (const chunk of iterable) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  })();
}

export class R2StorageRepository implements StorageRepository {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const accountId = env.R2_ACCOUNT_ID!;
    this.bucket = env.R2_BUCKET!;
    // Jurisdiction-locked buckets (e.g. EU) live on `{account}.{eu|fedramp}.r2…`;
    // the default endpoint returns NoSuchBucket even when the bucket exists.
    const jurisdiction = env.R2_JURISDICTION;
    const host = jurisdiction
      ? `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
      : `${accountId}.r2.cloudflarestorage.com`;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${host}`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  private key(...parts: string[]): string {
    return parts.join("/");
  }

  private userRootKey(email: string): string {
    return userFolder(email);
  }

  private periodKey(email: string, input: PeriodInput): string {
    return userPeriodPrefix(email, input);
  }

  async ensureUser(_email: string) {
    /* R2 has no directories — keys are created on first put. */
  }

  async clearPeriod(email: string, input: PeriodInput) {
    const prefix = `${this.periodKey(email, input)}/`;
    let token: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (listed.Contents || []).map((o) => ({ Key: o.Key! }));
      if (keys.length) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }));
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  }

  async writePlan(email: string, code: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(this.userRootKey(email), "subscription.txt"),
        Body: code,
        ContentType: "text/plain",
      }),
    );
  }

  async writeAmazonToken(email: string, token: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(this.userRootKey(email), "amazon-token.txt"),
        Body: token,
        ContentType: "text/plain",
      }),
    );
  }

  async saveCsv(
    email: string,
    input: PeriodInput,
    filename: string,
    buffer: Buffer,
  ): Promise<SavedCsv> {
    const safe = filename.replace(/\s+/g, "_");
    const prefix = this.periodKey(email, input);
    const objectKey = this.key(prefix, safe);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: "text/csv",
      }),
    );
    return { filename: safe, dir: prefix };
  }

  async writeArtifacts(
    dir: string,
    baseName: string,
    artifacts: { json: object; pdf: Buffer; xlsx: Buffer },
  ) {
    const stem = baseName.replace(/\.csv$/i, "");
    const writes = [
      {
        key: this.key(dir, `${stem}.csvprocesado.json`),
        body: JSON.stringify(artifacts.json, null, 2),
        type: "application/json",
      },
      {
        key: this.key(dir, `${stem}.csvprocesado.pdf`),
        body: artifacts.pdf,
        type: "application/pdf",
      },
      {
        key: this.key(dir, `${stem}.csvprocesado.xlsx`),
        body: artifacts.xlsx,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ];
    await Promise.all(
      writes.map((w) =>
        this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: w.key,
            Body: w.body,
            ContentType: w.type,
          }),
        ),
      ),
    );
  }

  async listExcelKeys(email: string) {
    const result = { monthly: [] as string[], quarterly: [] as string[] };
    const prefix = `${this.userRootKey(email)}/`;
    let token: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      for (const obj of listed.Contents || []) {
        const rel = obj.Key!.slice(prefix.length);
        if (/\.(xlsx|xls)$/i.test(rel)) {
          if (rel.startsWith("monthly/")) result.monthly.push(rel.replace(/^monthly\//, ""));
          if (rel.startsWith("quarterly/")) result.quarterly.push(rel.replace(/^quarterly\//, ""));
        }
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
    return result;
  }

  async listProcessedPeriods(email: string): Promise<PeriodInput[]> {
    const periods: PeriodInput[] = [];
    const root = `${this.userRootKey(email)}/`;

    for (const fileType of ["monthly", "quarterly"] as const) {
      const prefix = `${root}${fileType}/`;
      const folderNames = new Set<string>();
      let token: string | undefined;
      do {
        const listed = await this.client.send(
          new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
        );
        for (const obj of listed.Contents || []) {
          const rel = obj.Key!.slice(prefix.length);
          const folder = rel.split("/")[0];
          if (folder && rel.toLowerCase().endsWith(".json")) folderNames.add(folder);
        }
        token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (token);

      for (const name of folderNames) {
        const parsed =
          fileType === "monthly" ? parseMonthlyFolder(name) : parseQuarterlyFolder(name);
        if (parsed) periods.push(parsed);
      }
    }

    return periods.sort((a, b) => periodSortKey(b) - periodSortKey(a));
  }

  async listPeriodFormats(email: string, input: PeriodInput): Promise<string[]> {
    const prefix = `${this.periodKey(email, input)}/`;
    const exts = new Set<string>();
    let token: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      for (const obj of listed.Contents || []) {
        const name = path.posix.basename(obj.Key!);
        if (name.toLowerCase().endsWith(".pdf")) exts.add("pdf");
        if (name.toLowerCase().endsWith(".xlsx")) exts.add("xlsx");
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
    return ["pdf", "xlsx"].filter((e) => exts.has(e));
  }

  async findInPeriod(email: string, input: PeriodInput, ext: string): Promise<PeriodFile | null> {
    const prefix = `${this.periodKey(email, input)}/`;
    let token: string | undefined;
    let matchKey: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      for (const obj of listed.Contents || []) {
        if (obj.Key!.toLowerCase().endsWith(ext.toLowerCase())) {
          matchKey = obj.Key;
          break;
        }
      }
      if (matchKey) break;
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);

    if (!matchKey) return null;
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: matchKey }));
    const buffer = await streamToBuffer(res.Body as AsyncIterable<Uint8Array>);
    return {
      filename: path.posix.basename(matchKey),
      buffer,
      fullPath: matchKey,
    };
  }

  async readJson(email: string, input: PeriodInput): Promise<{ countries?: unknown[]; meta?: unknown } | null> {
    const file = await this.findInPeriod(email, input, ".json");
    if (!file) return null;
    return JSON.parse(file.buffer.toString("utf8"));
  }
}
