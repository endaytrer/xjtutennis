export function formatTime(timeSec: number): string {
    // regularize to one day
    timeSec = Math.min(Math.max(timeSec, 0), 86400);
    return String(Math.floor(timeSec / 3600)).padStart(2, "0") + ":" + String(Math.floor((timeSec % 3600) / 60)).padStart(2, "0")
}
export function parseTime(timeFmt: string): number {
    const [hr, mn] = timeFmt.split(":");
    return parseInt(hr) * 3600 + parseInt(mn) * 60;
}
export function formatDuration(timeSec: number): string {
    const hour = Math.floor(timeSec / 3600);
    const minute = Math.floor((timeSec % 3600) / 60);
    let ans = ""
    if (hour > 0) {
        ans += String(hour) + " hour"
        if (hour > 1) {
            ans += "s"
        }
        if (minute > 0) {
            ans += " "
        }
    } else if (minute == 0) {
        return "0 minute"
    }
    if (minute > 0) {
        ans += String(minute) + " minute"

        if (minute > 1) {
            ans += "s"
        }
    }
    return ans;
}