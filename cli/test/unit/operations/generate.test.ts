import test from "ava";
import { testGenerate } from "../../utils/generator.js";

test("verify cli generate invalid template", async (t) => {
  const op = testGenerate({ template: "invalid" });
  await t.throwsAsync(async () => {
    await op.verify();
  });
});

test("verify cli generate correct template", async (t) => {
  const reactAppOp = testGenerate({
    template: "with-vite-react",
    workspace: "root",
    name: "test-react-app",
  });

  const nodeAppOp = testGenerate({
    template: "with-node",
    workspace: "root",
    name: "test-node-app",
  });

  await t.notThrowsAsync(async () => {
    await reactAppOp.verify();
    await nodeAppOp.verify();
  });
});

test("get generate steps", async (t) => {
  const op = testGenerate();
  await op.prompt();

  t.is(op.cli?.template, "with-node");
  t.is(op.cli?.name, undefined);
  t.is(op.cli?.workspace, "templates");
});

test("get generate steps with params", async (t) => {
  const op = testGenerate({ template: "with-vite-react", name: "my-app" });

  await op.prompt();

  t.is(op.cli?.template, "with-vite-react");
  t.is(op.cli?.name, "my-app");
  t.is(op.cli?.workspace, "templates");
});
