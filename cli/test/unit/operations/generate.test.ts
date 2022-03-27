import pMap from "p-map";
import { join } from "path";
import GenerateOperation from "../../../src/operations/generate.js";
import { createTest } from "../../utils/ava.js";
import {
  createApp,
  createTestDir,
  CreateTestDirValue,
  GenerateOpParams,
  testGenerate,
} from "../../utils/generator.js";
import { getCliRoot, getTemplates } from "../../utils/utils.js";

const test = createTest<{
  project: CreateTestDirValue;
  createOp: (params?: GenerateOpParams) => GenerateOperation;
  existingAppDir: string;
}>();

test.before(async (t) => {
  t.context.project = await createTestDir("generate-test", {
    removeDir: true,
  });

  const dir = await createApp(
    "existing-app",
    join(t.context.project.dir, "packages")
  );

  const createOp = (params?: GenerateOpParams) =>
    testGenerate({
      root: t.context.project.dir,
      ...(params || {}),
    });

  t.context.createOp = createOp;
  t.context.existingAppDir = dir;
});

test("verify cli generate invalid template", async (t) => {
  const { createOp } = t.context;
  const op = createOp();
  await t.throwsAsync(
    async () => {
      await op.verify({
        template: "invalid-template",
      });
    },
    { message: "Template does not exist" }
  );
});

test("verify cli generate invalid name", async (t) => {
  const { createOp } = t.context;
  const op = createOp();
  const templates = await getTemplates();
  await t.throwsAsync(
    async () => {
      await op.verify({
        name: "in S s132",
        template: templates[0].dir,
      });
    },
    {
      message:
        "Name must be lowercase, no spaces, no special characters, and at least 3 characters long",
    }
  );
});

test("verify cli invalid workspace", async (t) => {
  const { createOp } = t.context;
  const op = createOp({
    useDefault: true,
  });

  const templates = await getTemplates();
  await t.throwsAsync(
    async () => {
      await op.verify({
        isRoot: false,
        name: "test-app",
        template: templates[0].dir,
        workspace: "invalid-workspace",
      });
    },
    {
      message: "Workspace does not exist",
    }
  );
});

type InferPromise<T> = T extends Promise<infer U> ? U : T;
type InferArr<T> = T extends (infer U)[] ? U : T;
type Infer<T> = InferArr<InferPromise<T>>;

test("verify cli generate correct template", async (t) => {
  const { createOp } = t.context;
  const op = createOp();
  const templates = await getTemplates();
  await t.notThrowsAsync(async () => {
    const mapper = async ({ dir }: Infer<ReturnType<typeof getTemplates>>) => {
      await op.verify({
        template: dir,
        destination: "",
        name: "test-app",
        workspace: "packages",
      });
    };

    await pMap(templates, mapper, { concurrency: 1 });
  });
});

test("verify cli dir not empty", async (t) => {
  const { createOp, existingAppDir } = t.context;
  const op = createOp();
  const templates = await getTemplates();
  await t.throwsAsync(
    async () => {
      await op.verify({
        destination: existingAppDir,
        template: templates[0].dir,
        name: "new-app",
        workspace: "packages",
      });
    },
    { message: "Destination directory has files in it" }
  );

  await t.throwsAsync(
    async () => {
      await op.verify({
        destination: existingAppDir,
        template: templates[0].dir,
        name: "existing-app",
        workspace: "packages",
      });
    },
    { message: `App existing-app already exists` }
  );
});

test("get generate steps", async (t) => {
  const { createOp, project } = t.context;
  const op = createOp({
    useDefault: true,
    name: "test-app",
  });

  await op.prompt();
  t.deepEqual(op.proxy, {
    name: "test-app",
    isRoot: false,
    destination: join(project.dir, "packages", "test-app"),
    template: join(getCliRoot(), "..", "templates", "with-node"),
    workspace: "packages",
  });
});
