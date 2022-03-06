import test from "ava";
import VError from "verror";
import DeleteCommand from "../../../src/operations/delete.js";
import { getCli } from "../../../src/utils.js";

test("verify cli delete invalid name", async (t) => {
  await t.throwsAsync(
    async () => {
      const cli = getCli(["delete", "--name=invalid-name"]);
      await new DeleteCommand(cli).verify();
    },
    { instanceOf: VError, message: "App does not exist" }
  );
});

test("get delete steps", async (t) => {
  const cli = getCli(["delete"]);
  const command = new DeleteCommand({
    ...cli,
    override: {
      useDefault: true,
    },
  });
  await command.prompt();

  t.is(command.cli?.name, undefined);
});

test("get delete steps with params", async (t) => {
  const cli = getCli(["delete", "--name=my-app"]);
  const command = new DeleteCommand({
    ...cli,
    override: {
      useDefault: true,
    },
  });
  await command.prompt();

  t.is(command.cli?.name, "my-app");
});
