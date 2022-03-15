import avaTest, { ExecutionContext, TestFn } from "ava";
import { execa } from "execa";
import fs from "fs-extra";
import { join } from "path";
import Cli from "../../src/cli.js";
import GenerateCommand from "../../src/operations/generate.js";

const makeTestDir = (name: string, root?: string) => {
  const nroot = root || process.cwd();
  const dir = join(nroot, name);
  const exists = fs.pathExistsSync(dir);
  if (exists) fs.removeSync(dir);
  fs.mkdirSync(dir);
  return dir;
};

const test = avaTest as TestFn<{
  root: string;
}>;

test.before((t) => {
  t.context.root = makeTestDir("cli-test");
});

// test.after.always((t) => {
//   fs.removeSync(t.context.root);
// });

test("show help", async (t) => {
  const { stdout } = await execa("yarn", ["cli", "--help"]);
  t.true(stdout.includes("$ vx <command> [options]"));
});

test("set root", async (t) => {
  const cli = new Cli(t.context.root);
  t.is(cli.root, t.context.root);
});

const generate = async (
  t: ExecutionContext,
  cli: Cli,
  root: string,
  name: string,
  template: string,
  workspace?: string
) => {
  const op: GenerateCommand = (await cli.main([
    "generate",
    `--name=${name}`,
    `--template=${template}`,
    ...(workspace ? [`--workspace=${workspace}`] : []),
    "--no-confirm",
  ])) as GenerateCommand;

  t.log(op.values);
  t.is(op.root, root);
  t.is(op.values.name, name);
  t.true(op.templates.includes(template));
  if (workspace !== "root") t.true(op.workspaces.includes(workspace));

  const workspacePath = workspace !== "root" ? join(root, workspace) : root;
  const appPath = join(workspacePath, name);
  const pkgPath = join(appPath, "package.json");

  const isValid =
    (await fs.pathExists(appPath)) && (await fs.pathExists(pkgPath));
  t.true(isValid);

  if (isValid) {
    const pkgJSON = fs.readJSONSync(pkgPath);
    t.is(pkgJSON.name, name);
  }
};

test("generate myapp", async (t) => {
  const newRoot = makeTestDir("generate", t.context.root);
  const rootPkg = join(newRoot, "package.json");

  fs.writeJSONSync(rootPkg, {
    name: "test-generate",
    workspaces: ["packages/*"],
  });

  const rootPkgJSON = fs.readJSONSync(rootPkg);

  t.deepEqual(rootPkgJSON.workspaces, ["packages/*"]);
  t.is(rootPkgJSON.name, "test-generate");

  const cli = new Cli(newRoot);
  await generate(t, cli, newRoot, "my-app", "with-vite-react", "packages");

  await t.throwsAsync(async () => {
    await generate(t, cli, newRoot, "my-app", "with-vite-react", "packages");
  });

  await t.notThrowsAsync(async () => {
    await generate(t, cli, newRoot, "my-app", "with-vite-react", "root");
  });

  await t.throwsAsync(async () => {
    await generate(t, cli, newRoot, "my-app", "with-vite-react", "root");
  });

  await t.notThrowsAsync(async () => {
    await generate(t, cli, newRoot, "my-app-two", "with-vite-react", "root");
  });
});
