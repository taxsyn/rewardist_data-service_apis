export const logMemoryUsage = (label) => {
  const memory = process.memoryUsage();
  const toMb = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;

  console.log(`[memory] ${label}`, {
    heapUsedMb: toMb(memory.heapUsed),
    rssMb: toMb(memory.rss)
  });
};