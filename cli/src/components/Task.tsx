import figures from "figures";
import { Box, Text, Spacer } from "ink";
import React from "react";
import _ from "lodash";
import Color from "color";
import TaskData from "../operations/task.js";
import Loader from "./Loader.js";

interface TaskProps {
  task: TaskData;
}

function Task({ task }: TaskProps) {
  const statuses: Record<typeof task["status"], React.ReactNode> = {
    success: <Text color="green">{figures.tick}</Text>,
    error: <Text color="red">{figures.cross}</Text>,
    idle: <Text color="blue">{figures.info}</Text>,
    loading: <Loader type="dots" color="yellow" />,
  };

  return (
    <Box display="flex" flexDirection="column">
      <Box marginLeft={task.level * 2} display="flex" alignItems="center">
        {task.error ? (
          <Text backgroundColor="red">{` Error `}</Text>
        ) : (
          statuses[task.status]
        )}
        {!task.error && (
          <Box marginLeft={1}>
            <Text>{task.message}</Text>
          </Box>
        )}
        {task.error && (
          <Box marginLeft={1}>
            <Text>{task.error}</Text>
            <Text color="gray">{` (${task.message})`}</Text>
          </Box>
        )}
        <Spacer />
        {!task.execution && typeof task.progress === "number" && (
          <Progression progress={task.progress} rate={60} />
        )}
        {task.execution && (
          <Text color="gray">{`took ${task.execution.toFixed(3)}s`}</Text>
        )}
      </Box>
      {task.description && (
        <Box marginLeft={task.level * 2} display="flex" alignItems="center">
          <Text color="gray">{task.description}</Text>
        </Box>
      )}
    </Box>
  );
}

interface ProgressionProps {
  progress: number;
  rate?: number;
}

function Progression({ progress, rate = 30 }: ProgressionProps) {
  const [value, setValue] = React.useState(0);

  const update = async (step: number) => {
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        resolve();
      }, 1000 / rate)
    );

    setValue((value) => _.clamp(value + step, 0, 100));
  };

  React.useEffect(() => {
    const step = (progress - value) / rate;
    if (value >= progress) return;
    update(step);
  }, [progress, value]);

  const color = Color.hsl(149, 64 * value, 50).hex();
  return <Text color={color}>{`${(value * 100).toFixed(0)}%`}</Text>;
}

export default Task;
