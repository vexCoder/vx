import { join } from "path";
import InitOperation from "../../../src/operations/init.js";
import { createTest } from "../../utils/ava.js";
import {
  createTestDir,
  CreateTestDirValue,
  InitOpParams,
  testInit,
  getPkg,
} from "../../utils/index.js";
import { getCliRoot } from "../../utils/utils.js";

const test = createTest<{
  processProject: CreateTestDirValue;
  validProject: CreateTestDirValue;
  invalidProject: CreateTestDirValue;
  createOp: () => InitOperation;
  apps: Record<string, string>;
}>();

test.before(async (t) => {
  t.context.processProject = await createTestDir("process-valid-test", {
    removeDir: true,
    removePkg: true,
  });

  t.context.validProject = await createTestDir("init-valid-test", {
    removeDir: true,
    removePkg: true,
  });

  t.context.invalidProject = await createTestDir("init-invalid-test", {
    removeDir: true,
  });

  const createOp = (params?: InitOpParams) =>
    testInit({
      root: t.context.invalidProject.dir,
      ...(params || {}),
    });

  t.context.createOp = createOp;
});

test("verify directory is not empty throws error", async (t) => {
  const { createOp } = t.context;
  await t.throwsAsync(
    async () => {
      const op = createOp();
      await op.prompt({
        root: t.context.invalidProject.dir,
      });
      await op.verify();
    },
    {
      message: "Current directory is not empty",
    }
  );
});

test("verify directory is empty", async (t) => {
  const { createOp } = t.context;
  await t.notThrowsAsync(async () => {
    const op = createOp();
    await op.prompt({
      root: t.context.validProject.dir,
    });
    await op.verify();
  });
});

test("verify directory correct name", async (t) => {
  const { createOp } = t.context;
  const op = createOp();
  await op.prompt({
    root: t.context.validProject.dir,
  });

  await op.verify();

  t.deepEqual(op.values.name, t.context.validProject.name);
});

test("prompt set override tmp values", async (t) => {
  const { createOp } = t.context;

  const op = createOp();
  await op.prompt({
    root: t.context.validProject.dir,
  });

  t.deepEqual(op.proxy.path, t.context.validProject.dir);
});

test("prompt set tmp values", async (t) => {
  const { createOp } = t.context;

  const op = createOp();
  await op.prompt();

  t.deepEqual(op.proxy.path, getCliRoot());
});

test("process copy files", async (t) => {
  const { createOp, processProject } = t.context;

  const root = processProject.dir;
  const op = createOp();
  await op.prompt({
    root,
  });

  await op.verify();
  await op.process();

  const pkg = await getPkg(root);

  t.deepEqual(pkg?.name, "process-valid-test");
});

test("get init files", async (t) => {
  const { createOp } = t.context;

  const op = createOp();

  await t.throwsAsync(
    async () => {
      await op.getInitFiles();
    },
    { message: "Path is not defined" }
  );

  const files = await op.getInitFiles(t.context.processProject.dir);

  t.true(
    !!files.find(
      (v) => v.dest === join(t.context.processProject.dir, "package.json")
    )
  );
  t.true(
    !!files.find(
      (v) => v.dest === join(t.context.processProject.dir, ".eslintrc")
    )
  );
});
