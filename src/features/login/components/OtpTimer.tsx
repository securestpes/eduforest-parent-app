import React, { useEffect, useState } from 'react';
import { Text } from 'react-native-paper';

export const OtpTimer = ({
  initial,
  onCountdownEnd,
}: {
  initial: number;
  onCountdownEnd: () => void;
}) => {
  const [countdown, setCountdown] = useState(initial);

  useEffect(() => {
    if (countdown === 0) {
      onCountdownEnd();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onCountdownEnd]);

  return <Text>{countdown}</Text>;
};
