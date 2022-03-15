import test, { ExecutionContext, TestFn } from "ava";

export const createTest = <T = {}>() => test as TestFn<T>;

export const $ =
  <T>(cb: (t: ExecutionContext<T>, ctx: T) => void | Promise<void>) =>
  async (t: ExecutionContext<T>) => {
    await cb(t, t.context);
  };
