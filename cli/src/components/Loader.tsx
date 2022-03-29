import React from "react";
import { Box, Text, TextProps } from "ink";
import spinners from "cli-spinners";

interface LoaderProps extends TextProps {
  type?: spinners.SpinnerName;
}

function Loader({ type = "dots", ...rest }: LoaderProps) {
  const [frame, setFrame] = React.useState(0);
  const spinner = spinners[type];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrame((frame) => (frame + 1) % spinner.frames.length);
    }, spinner.interval);
    return () => clearInterval(interval);
  }, [type]);

  return (
    <Box display="flex">
      <Text {...rest}>{spinner.frames[frame]}</Text>
    </Box>
  );
}

export default Loader;
