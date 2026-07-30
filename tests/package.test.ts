import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("published package", () => {
  it("contains every public entry point, executable, and linked documentation file", async () => {
    const cacheDirectory = path.join(projectRoot, "node_modules", ".cache");
    await mkdir(cacheDirectory, { recursive: true });
    const directory = await mkdtemp(
      path.join(cacheDirectory, "mcp-handler-pack-"),
    );

    try {
      const tarball = execFileSync(
        "pnpm",
        ["pack", "--pack-destination", directory],
        {
          cwd: projectRoot,
          encoding: "utf8",
        },
      ).trim();

      execFileSync("tar", ["-xzf", tarball, "-C", directory]);
      const packageDirectory = path.join(directory, "package");
      const manifest = JSON.parse(
        await readFile(path.join(packageDirectory, "package.json"), "utf8"),
      );
      const readme = await readFile(
        path.join(packageDirectory, "README.md"),
        "utf8",
      );

      const publicFiles = [
        manifest.main,
        manifest.bin["mcp-handler"],
        ...Object.values(manifest.exports).flatMap((conditions: any) => [
          conditions.import,
          conditions.require,
          conditions.types.import,
          conditions.types.require,
        ]),
      ];
      for (const relativePath of new Set(publicFiles)) {
        await expect(
          stat(path.resolve(packageDirectory, relativePath)),
        ).resolves.toBeDefined();
      }

      const cli = await stat(
        path.resolve(packageDirectory, manifest.bin["mcp-handler"]),
      );
      expect(cli.mode & 0o111).not.toBe(0);

      const documentationLinks = [
        ...readme.matchAll(/\]\((docs\/[^)]+)\)/g),
      ].map((match) => match[1]);
      expect(documentationLinks).not.toHaveLength(0);
      for (const relativePath of documentationLinks) {
        await expect(
          stat(path.resolve(packageDirectory, relativePath)),
        ).resolves.toBeDefined();
      }

      const cjs = createRequire(import.meta.url)(packageDirectory);
      const esm = await import(
        pathToFileURL(
          path.resolve(packageDirectory, manifest.exports["."].import),
        ).href
      );
      expect(cjs.createMcpHandler).toBeTypeOf("function");
      expect(esm.createMcpHandler).toBeTypeOf("function");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
