export const compareVersions = (current: string, required: string): number => {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  for (let i = 0; i < requiredParts.length; i++) {
    const currentVal = currentParts[i] || 0;
    const requiredVal = requiredParts[i];

    if (currentVal < requiredVal) return -1;
    if (currentVal > requiredVal) return 1;
  }

  return 0;
};
