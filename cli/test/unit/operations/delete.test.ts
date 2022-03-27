import { join } from "path";
import DeleteOperation from "../../../src/operations/delete.js";
import { createTest } from "../../utils/ava.js";
import {
  createApp,
  createEmptyFolder,
  createTestDir,
  CreateTestDirValue,
  createUnlockedApp,
  testDelete,
} from "../../utils/generator.js";

const test = createTest<{
  project: CreateTestDirValue;
  createOp: () => DeleteOperation;
  apps: Record<string, string>;
}>();

test.before(async (t) => {
  t.context.project = await createTestDir("delete-test", {
    removeDir: true,
  });

  const dirRootApp = await createApp("delete-root-app", t.context.project.dir);
  const dirEmptyApp = await createEmptyFolder(
    "delete-empty-app",
    t.context.project.dir
  );
  const dirDeleteApp = await createApp(
    "delete-app",
    join(t.context.project.dir, "packages")
  );
  const dirUnlockedApp = await createUnlockedApp(
    "delete-app-unlocked",
    join(t.context.project.dir, "packages")
  );
  const dirInvalidApp = await createApp(
    "delete-invalid-app",
    join(t.context.project.dir, "packages"),
    {
      name: "invalid-name",
    }
  );

  const createOp = () =>
    testDelete({
      root: t.context.project.dir,
    });

  t.context.createOp = createOp;
  t.context.apps = {
    dirRootApp,
    dirDeleteApp,
    dirUnlockedApp,
    dirEmptyApp,
    dirInvalidApp,
  };
});

test("verify invalid path", async (t) => {
  const { createOp } = t.context;
  const op = createOp();
  await t.throwsAsync(
    async () => {
      await op.prompt({ name: "invalid-name" });
      await op.verify();
    },
    { message: "Invalid path" }
  );

  await t.throwsAsync(
    async () => {
      await op.verify({ path: "invalid-path" });
    },
    {
      message: "Invalid path",
    }
  );
});

test("verify app does exists", async (t) => {
  const { createOp, apps } = t.context;
  const op = createOp();

  await t.throwsAsync(
    async () => {
      await op.prompt();
      await op.verify({
        path: apps.dirEmptyApp,
      });
    },
    {
      message: "App is invalid",
    }
  );
});

test("verify valid path", async (t) => {
  const { createOp } = t.context;
  const op = createOp();

  await t.notThrowsAsync(async () => {
    await op.prompt({ name: "delete-app-unlocked" });
    await op.verify();
  });
});

test("verify app in valid", async (t) => {
  const { createOp, apps } = t.context;
  const op = createOp();

  await t.throwsAsync(
    async () => {
      await op.verify({
        path: apps.dirInvalidApp,
      });
    },
    {
      message: "App is invalid",
    }
  );
});
