import { createTest } from "../../utils/ava.js";
import {
  CreateTestDirValue,
  createTestDir,
  testInit,
  InitOpParams,
} from "../../utils/index.js";
import InitOperation from "../../../src/operations/init.js";

const test = createTest<{
  validProject: CreateTestDirValue;
  invalidProject: CreateTestDirValue;
  createOp: () => InitOperation;
  apps: Record<string, string>;
}>();

test.before(async (t) => {
  t.context.validProject = await createTestDir("init-valid-test", {
    removePkg: true,
  });
  t.context.invalidProject = await createTestDir("init-invalid-test", {
    removePkg: true,
  });

  const createOp = (params?: InitOpParams) =>
    testInit({
      root: t.context.invalidProject.dir,
      ...(params || {}),
    });

  t.context.createOp = createOp;
});

test.skip("verify directory is empty", async (t) => {
  t.true(true);
});

test("prompt set tmp values", async (t) => {
  const { createOp } = t.context;

  const op = createOp();
  await op.prompt();

  t.deepEqual(op.tmp.path, undefined);
});
