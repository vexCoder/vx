import { join } from "path";
import { createTest } from "../../utils/ava.js";
import {
  createApp,
  createTestDir,
  CreateTestDirValue,
  testDelete,
} from "../../utils/generator.js";

const test = createTest<{
  project: CreateTestDirValue;
}>();

test.before(async (t) => {
  t.context.project = await createTestDir("delete-test", {
    removeDir: true,
  });

  await createApp("delete-app", join(t.context.project.dir, "packages"));
  await createApp("delete-app-2", join(t.context.project.dir, "packages"));
  await createApp("delete-root-app", t.context.project.dir);
});

test.after.always(async (t) => {
  await t.context.project.delete();
});

test("verify cli delete invalid name", async (t) => {
  const { project } = t.context;

  await t.throwsAsync(
    async () => {
      const op = testDelete({
        root: project.dir,
        name: "invalid-name",
      });

      await op.verify();
    },
    { message: "Path does not exist" }
  );

  await t.throwsAsync(
    async () => {
      const op = testDelete({
        root: project.dir,
        name: "invalid-name",
      });

      await op.verify();
    },
    { message: "Path does not exist" }
  );
});
