import test from "ava";
import GenerateCommand from "../../../src/operations/generate.js";
import { getCli } from "../../../src/utils.js";

test("verify cli generate invalid template", async (t) => {
  await t.throwsAsync(
    async () => {
      const cli = getCli(["generate", "--template=invalid-template"]);
      await new GenerateCommand(cli).verify();
    },
    { message: "Template does not exist" }
  );
});

test("verify cli generate correct template", async (t) => {
  await t.notThrowsAsync(async () => {
    const reactAppCli = getCli(["generate", "--template=with-vite-react"]);
    const nodeAppCli = getCli(["generate", "--template=with-node"]);

    await new GenerateCommand(reactAppCli).verify();
    await new GenerateCommand(nodeAppCli).verify();
  });
});

test("get generate steps", async (t) => {
  const cli = getCli(["generate"]);
  const command = new GenerateCommand({
    ...cli,
    override: {
      useDefault: true,
    },
  });

  await command.prompt();

  t.is(command.cli?.template, "with-node");
  t.is(command.cli?.name, undefined);
  t.is(command.cli?.workspace, "templates");
});

test("get generate steps with params", async (t) => {
  const cli = getCli([
    "generate",
    "--template=with-vite-react",
    "--name=my-app",
  ]);
  const command = new GenerateCommand({
    ...cli,
    override: {
      useDefault: true,
    },
  });

  await command.prompt();

  t.is(command.cli?.template, "with-vite-react");
  t.is(command.cli?.name, "my-app");
  t.is(command.cli?.workspace, "templates");
});
