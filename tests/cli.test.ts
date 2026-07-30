import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const cliPath = path.resolve(import.meta.dirname, "../dist/cli/index.js");

async function nextProject(sourceDirectory = false) {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-handler-cli-"));
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({
      private: true,
      dependencies: {
        next: "16.0.0",
      },
    }),
  );
  if (sourceDirectory) {
    await mkdir(path.join(directory, "src", "app"), { recursive: true });
  }
  return directory;
}

describe("mcp-handler CLI", () => {
  it("generates a static MCP route in an app-directory Next.js project", async () => {
    const directory = await nextProject();

    const result = spawnSync(process.execPath, [cliPath, "--no-install"], {
      cwd: directory,
      encoding: "utf8",
    });
    const route = await readFile(
      path.join(directory, "app", "api", "mcp", "route.ts"),
      "utf8",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(route).toContain("import { createMcpHandler } from 'mcp-handler';");
    expect(route).toContain("server.registerTool(");
    expect(route).toContain("export { handler as GET, handler as POST };");
    expect(route).not.toContain("[transport]");
    expect(route).not.toContain("basePath");
  });

  it("uses src/app when present and never overwrites an existing route", async () => {
    const directory = await nextProject(true);
    const routeDirectory = path.join(directory, "src", "app", "api", "mcp");
    const routePath = path.join(routeDirectory, "route.ts");
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(routePath, "// user-owned route\n");

    const result = spawnSync(process.execPath, [cliPath, "--no-install"], {
      cwd: directory,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("already exists");
    expect(await readFile(routePath, "utf8")).toBe("// user-owned route\n");
  });
});
