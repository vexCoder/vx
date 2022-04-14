import test from "ava";
import fs from "fs-extra";
import { join } from "path";
import Cli from "../../src/cli.js";
import {
  getCli,
  getCliRoot,
  getProjectRoot,
  getTemplateList,
  getWorkspaceApps,
  getWorkspaceList,
  setRoot,
} from "../../src/utils.js";

const mainRoot = process.cwd();

type SetResetCallback = (newRoot: string) => void;
const setResetRoot = (
  pathOrCallback?: string | SetResetCallback,
  callback?: SetResetCallback
) => {
  const path = typeof pathOrCallback === "string" ? pathOrCallback : undefined;
  const root = setRoot(path);
  if (typeof pathOrCallback === "function") pathOrCallback(root);
  else if (callback) callback(root);
  setRoot(mainRoot);
};

test("get project root", (t) => {
  const root = getProjectRoot();
  t.is(root, join(mainRoot, ".."));
});

test("get cli root", (t) => {
  const root = getCliRoot();
  t.is(root, join(mainRoot, ".."));
});

test("set root", (t) => {
  setResetRoot(".", (root) => {
    t.is(root, mainRoot);
  });
});

test("set no params", (t) => {
  setResetRoot((root) => {
    t.is(root, mainRoot);
  });
});

test("set root up one level", (t) => {
  setResetRoot("..", (root) => {
    t.is(root, join(mainRoot, ".."));
  });
});

test("set root up two level", (t) => {
  setResetRoot("../..", (root) => {
    t.is(root, join(mainRoot, "..", ".."));
  });
});

test("set root throw invalid path", (t) => {
  t.throws(
    () => {
      setRoot("../is-an-invalid-path");
    },
    { message: "Invalid path" }
  );
});

test("get cli", (t) => {
  const cli = getCli("generate");

  t.true(!!cli);
});

test("get cli values", (t) => {
  const cli = getCli("generate", "--template=react-app", "--name=my-app");

  t.deepEqual(cli, {
    command: "generate",
    template: "react-app",
    name: "my-app",
    confirm: true,
    concurrency: Infinity,
  });
});

test("verify cli invalid command", async (t) => {
  await t.throwsAsync(async () => {
    await new Cli().main(["invalid-command"]);
  });
  t.true(true);
});

test("get templates", (t) => {
  const templates = getTemplateList();

  t.true(templates.length > 0);
  t.true(templates.map((v) => v.name).includes("with-vite-react"));
  t.true(templates.map((v) => v.name).includes("with-node"));
});

test("get workspaces", (t) => {
  const types = getWorkspaceList();

  t.is(types.length, 1);
  t.is(types[0], "templates");
});

test("get workspace apps", (t) => {
  const root = getCliRoot();
  const types = getWorkspaceApps(root, "templates");
  const workspaceDir = fs.readdirSync(join(root, "templates"));

  t.is(types.length, workspaceDir.length);
  t.true(!!types.find((v) => v.name === workspaceDir[0]));
});

test("get all workspaces apps", (t) => {
  const root = getCliRoot();
  const types = getWorkspaceApps();
  const workspaceDir = fs.readdirSync(join(root, "templates"));

  t.log(root, types);
  t.is(types.length, 2 + workspaceDir.length);
  t.true(!!types.find((v) => v.name === workspaceDir[0]));
});
