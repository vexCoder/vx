import { $, createTest } from "../../utils/ava.js";
import {
  createTestDir,
  CreateTestDirValue,
  testDelete,
  testGenerate,
} from "../../utils/generator.js";
import { readPkg } from "../../utils/utils.js";

const test = createTest<{
  project: CreateTestDirValue;
}>();

test.before(async (t) => {
  t.context.project = await createTestDir("delete-test", {
    removeDir: true,
  });

  const op = testGenerate({
    root: t.context.project.dir,
    name: "delete-app",
    template: "with-vite-react",
    workspace: "packages",
  });

  await op.prompt();
  await op.verify();
  await op.process();
});

test.after.always(async (t) => {
  await t.context.project.delete();
});

test(
  "verify cli delete invalid name",
  $(async (t, ctx) => {
    const { project } = ctx;

    await t.throwsAsync(
      async () => {
        const op = testDelete({
          root: project.dir,
          name: "invalid-name",
        });

        await op.verify();
      },
      { message: "App does not exist" }
    );
  })
);

test(
  "get delete steps",
  $(async (t, ctx) => {
    const { project } = ctx;
    const op = testDelete({
      root: project.dir,
    });

    await op.prompt();

    t.is(op.cli?.name, undefined);
  })
);

test(
  "get delete steps with params",
  $(async (t, ctx) => {
    const { project } = ctx;
    const op = testDelete({
      root: project.dir,
      name: "delete-app",
    });

    await op.prompt();

    t.is(op.cli?.name, "delete-app");
  })
);

test(
  "get to delete paths",
  $(async (t, ctx) => {
    const { project } = ctx;
    const op = testDelete({
      root: project.dir,
      name: "delete-app",
    });

    const files = await op.getFiles();
    const pkgPath = files.find((v) => v.name === "package.json");
    const config = await readPkg(pkgPath.path);

    t.true(files.map((v) => v.name).includes("package.json"));
    t.is(config.name, "delete-app");
  })
);
