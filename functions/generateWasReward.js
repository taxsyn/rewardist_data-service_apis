export const generateWasReward = (rewardHistory) => {
    // Handle empty array case
    if (!rewardHistory.length) {
        return undefined;
    }

    // Create a copy to avoid mutating the original array and sort it numerically
    const sorted = [...rewardHistory].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted[mid];

}