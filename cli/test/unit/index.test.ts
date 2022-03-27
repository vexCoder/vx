import Cli from "../../src/cli.js";
import { createTest } from "../utils/ava.js";
import {
  createTestDir,
  CreateTestDirValue,
  testGenerate,
} from "../utils/generator.js";

const test = createTest<{
  root: CreateTestDirValue;
}>();

test.before(async (t) => {
  t.context.root = await createTestDir("cli-test", {
    removeDir: true,
  });
});

test("set root", async (t) => {
  const cli = new Cli(t.context.root.dir);
  t.is(cli.root, t.context.root.dir);
});

const buildGenerator =
  (root: string) =>
  async (name: string, template: string, workspace: string) => {
    const op = testGenerate({
      root,
      name,
      template,
      workspace,
    });

    await op.prompt();
    await op.verify();
    await op.process();
  };

test("generate myapp", async (t) => {
  const newRoot = t.context.root.dir;
  const pkg = await t.context.root.pkg();

  t.deepEqual(pkg.workspaces, ["packages/*"]);
  t.is(pkg.name, "cli-test");

  const generate = buildGenerator(newRoot);

  await t.notThrowsAsync(async () => {
    await generate("my-app", "with-vite-react", "packages");
  });

  await t.throwsAsync(async () => {
    await generate("my-app", "with-vite-react", "packages");
  });

  await t.notThrowsAsync(async () => {
    await generate("my-app-root", "with-vite-react", "root");
  });

  await t.throwsAsync(async () => {
    await generate("my-app-root", "with-vite-react", "root");
  });

  await t.notThrowsAsync(async () => {
    await generate("my-app-two", "with-vite-react", "root");
  });
});
