import { Task, FocusSession } from '../store/useTaskStore';
import { startOfDay, addMinutes, isSameDay, getHours, setHours, setMinutes, isAfter, isBefore } from 'date-fns';

interface TimeBlock {
    start: Date;
    end: Date;
}

// Map Priority to numeric value for sorting
const PRIORITY_WEIGHT = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

/**
 * Analyzes historical focus sessions to determine the user's 2 most productive hours of the day.
 * If not enough data, defaults to 9 AM - 11 AM.
 */
export const calculatePeakHours = (sessions: FocusSession[]): number[] => {
    if (!sessions || sessions.length < 5) {
        return [9, 10]; // Default Peak
    }

    const hourCounts: Record<number, number> = {};
    sessions.forEach(session => {
        const hour = getHours(new Date(session.timestamp));
        hourCounts[hour] = (hourCounts[hour] || 0) + session.duration;
    });

    // Find top 2 hours with most focus time
    const sortedHours = Object.entries(hourCounts)
        .sort(([, durationA], [, durationB]) => durationB - durationA)
        .map(([hour]) => parseInt(hour));

    return sortedHours.slice(0, 2);
};

/**
 * Generates an automated schedule for the requested tasks.
 * Prioritizes Critical -> High -> Medium -> Low.
 * Will attempt to place Critical/High tasks during the user's Peak Hours.
 */
export const generateSchedule = (
    uncompletedTasks: Task[],
    sessions: FocusSession[],
    startHour: number = 9,
    endHour: number = 17,
    workdayStart: Date = new Date() // Usually today
): Task[] => {
    
    // 1. Calculate Peak Hours
    const peakHours = calculatePeakHours(sessions);
    
    // 2. Separate manually scheduled tasks from those needing optimization
    // We only optimize tasks that are NOT manually scheduled or are already marked as auto-scheduled
    const tasksToOptimize = uncompletedTasks.filter(t => !t.scheduled_start || t.is_auto_scheduled);
    const manualTasks = uncompletedTasks.filter(t => t.scheduled_start && !t.is_auto_scheduled);

    // 2b. Sort optimization pool by Priority (highest first) then Order
    const sortedTasks = [...tasksToOptimize].sort((a, b) => {
        if (PRIORITY_WEIGHT[b.priority] !== PRIORITY_WEIGHT[a.priority]) {
            return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        }
        return a.order - b.order;
    });

    const scheduledTasks: Task[] = [...manualTasks]; // Keep manual ones as is
    
    // Time tracking variables
    let currentStandardTime = setMinutes(setHours(workdayStart, startHour), 0);
    // Align peak time with the start of the first peak hour found
    let currentPeakTime = setMinutes(setHours(workdayStart, peakHours[0] || startHour), 0);
    const endOfDayTime = setMinutes(setHours(workdayStart, endHour), 0);

    // Prevent scheduling in the past if scheduling for today
    if (isSameDay(workdayStart, new Date()) && isBefore(currentStandardTime, new Date())) {
        currentStandardTime = addMinutes(new Date(), 15); // Start 15 mins from now
        // Round to nearest 15 mins for neatness
        const mins = currentStandardTime.getMinutes();
        const roundedMins = Math.ceil(mins / 15) * 15;
        currentStandardTime.setMinutes(roundedMins);
        currentStandardTime.setSeconds(0);
        currentStandardTime.setMilliseconds(0);
        
        // Ensure Peak time isn't in the past either
        if (isBefore(currentPeakTime, currentStandardTime)) {
            currentPeakTime = new Date(currentStandardTime);
        }
    }


    sortedTasks.forEach(task => {
        const durationEstimate = task.duration_estimate || 30; // Default 30 mins
        
        let assignedStart: Date;
        
        // Attempt to schedule Critical/High tasks in peak hours
        if ((task.priority === 'critical' || task.priority === 'high') && isBefore(currentPeakTime, endOfDayTime)) {
            assignedStart = new Date(currentPeakTime);
            // Advance peak time
            const nextPeakTime = addMinutes(currentPeakTime, durationEstimate + 5); 
            currentPeakTime = nextPeakTime;
            
            // If peak time overlaps standard time, push standard time forward
            if (isAfter(currentPeakTime, currentStandardTime)) {
                 currentStandardTime = new Date(currentPeakTime);
            }
        } else {
            // Schedule in standard time
            assignedStart = new Date(currentStandardTime);
            currentStandardTime = addMinutes(currentStandardTime, durationEstimate + 5); 
            
            // If standard time overlaps peak time, push peak time forward
            if (isAfter(currentStandardTime, currentPeakTime)) {
                 currentPeakTime = new Date(currentStandardTime);
            }
        }

        const assignedEnd = addMinutes(assignedStart, durationEstimate);

        scheduledTasks.push({
            ...task,
            scheduled_start: assignedStart.toISOString(),
            scheduled_end: assignedEnd.toISOString(),
            is_auto_scheduled: true
        });
    });

    return scheduledTasks;
};
