import test from "ava";
import { execa } from "execa";
import path from "path";
import fs from "fs-extra";
import {
  checkDirforFileOrDir,
  deleteAllInFolder,
  deleteFilePattern,
  getPkg,
} from "./utils.js";

const root = process.cwd();
const pathToE2E = path.join(root, "e2e");
const importMeta = import.meta;

const cmd = (cwd: string, ...args: string[]) => ["--cwd", cwd, "cli", ...args];

test("show help", async (t) => {
  const { stdout } = await execa("yarn", ["cli", "--help"]);
  t.true(stdout.includes("CLI manager for vex-turbo-boilerplate"));
});

test("should have workspace folder", async (t) => {
  const cwd = path.join(pathToE2E, "folder");
  await deleteFilePattern(cwd, "!*.json", "!.unlock");
  await execa("yarn", cmd(cwd));

  t.true(await checkDirforFileOrDir(cwd, "apps", "libs", "test"));

  await deleteFilePattern(cwd, "!*.json");
});

test("should generate react-app", async (t) => {
  const cwd = path.join(pathToE2E, "generate");

  await deleteFilePattern(cwd, "!*.json", "!.unlock");
  const { stdout } = await execa(
    "yarn",
    cmd(
      cwd,
      "generate",
      "--name=react-app",
      "--template=with-react",
      "--type=libs",
      "--noconfirm"
    )
  );

  const pkg = await getPkg(importMeta.url);
  const outputPkg = await getPkg(
    path.join(cwd, "libs", "react-app", "package.json")
  );

  t.true(
    await checkDirforFileOrDir(path.join(cwd, "libs"), "react-app"),
    'Directory "react-app" not found'
  );

  t.true(
    stdout.includes(`vx-cli ${pkg.version} generate`),
    "Incorrect command executed"
  );

  t.is(outputPkg.name, "react-app", "Package name is incorrect");

  await deleteFilePattern(cwd, "!*.json");
});

test("should not delete locked app", async (t) => {
  const cwd = path.join(pathToE2E, "locked");
  const pkg = await getPkg(importMeta.url);

  await deleteFilePattern(cwd, "!*.json");
  await execa(
    "yarn",
    cmd(
      cwd,
      "generate",
      "--name=react-app",
      "--template=with-react",
      "--type=libs",
      "--noconfirm"
    )
  );

  await execa("yarn", cmd(cwd, "delete", "--name=react-app", "--noconfirm"));

  const { stdout } = await execa(
    "yarn",
    cmd(cwd, "delete", "--name=react-app", "--noconfirm")
  );

  t.true(
    stdout.includes(`vx-cli ${pkg.version} delete`),
    "Incorrect command executed"
  );

  t.true(
    await checkDirforFileOrDir(path.join(cwd, "libs"), "react-app"),
    'Directory "react-app" does not exists'
  );

  await deleteFilePattern(cwd, "!*.json");
});

test("should delete unlocked app", async (t) => {
  const cwd = path.join(pathToE2E, "unlocked");
  const pkg = await getPkg(importMeta.url);

  await deleteFilePattern(cwd, "!*.json");
  await execa(
    "yarn",
    cmd(
      cwd,
      "generate",
      "--name=react-app",
      "--template=with-react",
      "--type=libs",
      "--noconfirm"
    )
  );

  await fs.writeFile(
    path.join(cwd, "libs", "react-app", ".unlock"),
    "",
    "utf8"
  );

  const { stdout } = await execa(
    "yarn",
    cmd(cwd, "delete", "--name=react-app", "--noconfirm")
  );

  t.true(
    stdout.includes(`vx-cli ${pkg.version} delete`),
    "Incorrect command executed"
  );

  t.true(
    !(await checkDirforFileOrDir(path.join(cwd, "libs"), "react-app")),
    'Directory "react-app" still exists'
  );

  await deleteFilePattern(cwd, "!*.json");
});

test("should create even without workspace", async (t) => {
  const cwd = path.join(pathToE2E, "root");
  const pkg = await getPkg(importMeta.url);

  await deleteFilePattern(cwd, "!*.json");
  const { stdout } = await execa(
    "yarn",
    cmd(
      cwd,
      "generate",
      "--name=react-app",
      "--template=with-react",
      "--noconfirm"
    )
  );

  t.true(
    stdout.includes(`vx-cli ${pkg.version} generate`),
    "Incorrect command executed"
  );

  t.true(
    await checkDirforFileOrDir(cwd, "react-app"),
    'Directory "react-app" does not exists'
  );

  await deleteFilePattern(cwd, "!*.json");
});

test("should initialize", async (t) => {
  const cwd = path.join(pathToE2E, "init");

  await execa("node", ["../../dist/cli.js", "init", "--noconfirm"], {
    cwd,
  });

  console.log(cwd);
  t.true(
    await checkDirforFileOrDir(cwd, "package.json"),
    'File "package.json" does not exists'
  );

  await deleteAllInFolder(cwd);
});
