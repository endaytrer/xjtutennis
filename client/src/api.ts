export interface Preference {
    
    StartTimeSec: number,
    DurationSec: number,
    CourtNamePreference: string[],
}
export interface Reservation {
    Date: string,
    Site: number,
    Preferences: Preference[],
    Priority: number,
}
export interface ReservationStatus {
    Uid: number,
    Reservation: Reservation,
    Status: {
        Code: number,
        Msg: string,
        CourtTime: Record<string, string>
    },
}
export interface ReservationResponse {
    Count: number,
    Result: ReservationStatus[],
}
export function defaultPreference(): Preference {
    return {
        StartTimeSec: 57600,
        DurationSec: 7200,
        CourtNamePreference: []
    }
}
export class IdClosure {
    private static id: number = 0;
    static getNewIdPref(): {id: number, pref: Preference} {
        return {
            id: IdClosure.id++,
            pref: defaultPreference()
        }
    }
}