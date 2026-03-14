import { Task } from '@/store/useTaskStore';

export const detectMissedTasks = (tasks: Task[]) => {
    const now = new Date();
    return tasks.filter(task => {
        if (task.completed || !task.deadline) return false;
        const deadlineDate = new Date(task.deadline);
        return deadlineDate < now;
    });
};

export const getProductivityInsights = (tasks: Task[]) => {
    const completed = tasks.filter(t => t.completed);
    const missed = detectMissedTasks(tasks);

    // Simple heuristic for best productivity time (based on completion timestamps)
    const completionHours = completed
        .map(t => t.completedAt ? new Date(t.completedAt).getHours() : -1)
        .filter(h => h !== -1);

    const hourlyCount: Record<number, number> = {};
    completionHours.forEach(h => {
        hourlyCount[h] = (hourlyCount[h] || 0) + 1;
    });

    let bestHour = -1;
    let maxCount = 0;
    Object.entries(hourlyCount).forEach(([hour, count]) => {
        if (count > maxCount) {
            maxCount = count;
            bestHour = parseInt(hour);
        }
    });

    return {
        completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
        missedCount: missed.length,
        bestHour: bestHour !== -1 ? `${bestHour}:00` : 'Not enough data',
        mostProductiveDay: 'Monday' // Placeholder for more complex logic
    };
};
