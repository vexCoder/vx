import { Logger, LogLevels } from "listr2";
import consola from "consola";

class ConsolaLogger extends Logger implements Logger {
  constructor() {
    super({
      useIcons: false,
    });
  }

  start(message: string): void {
    super.start(message);
  }

  data(message: string): void {
    super.data(message);
  }

  rollback(message: string): void {
    super.rollback(message);
  }

  title(message: string): void {
    super.title(message);
  }

  success(message: string): void {
    consola.success(message);
  }

  fail(message: string): void {
    consola.error(message);
  }

  parseMessage(lv: LogLevels, msg: string) {
    return super.parseMessage(lv, msg);
  }

  logColoring(opts: { level: LogLevels; message: string }): string {
    return super.logColoring(opts);
  }

  retry(message: string): void {
    super.retry(message);
  }

  skip(message: string): void {
    super.skip(message);
  }
}

export default ConsolaLogger;
