import { useEffect, useState } from "react";
import sites from "./sites";

import { IdClosure, Preference, Reservation as ReserveRequest } from "./api";
import { request, RequestErr } from "./request";
import { formatTime, parseTime, formatDuration } from "./utils";
import { dialog } from "./Dialog";
async function placeReservation(e: React.FormEvent, resRequest: ReserveRequest, setErrorMsg: (msg: string) => void) {
    e.preventDefault();
    try {
        console.log(resRequest)
        await request("/reservations", "POST", undefined, {Reservation: resRequest});
        await dialog("Info", "Info", "Reservation placed successfully.");
        window.location.href = "/dashboard"
    } catch (e) {
        if (e instanceof RequestErr) {
            setErrorMsg(e.message)
        } else {
            setErrorMsg(String(e))
        }
    }
}

function stringHash(str: string): number {
    const multiplier1 = 2654435761
    const multiplier2 = 2246822507
    let ans = 1597334677;
    for (const ch of str) {
        ans = ans + Math.imul(ch.charCodeAt(0), multiplier1)
        ans = Math.imul(ans, multiplier2)
    }
    return ans & 0x7fffffff
}
function randomTagStyle(name: string): string {
    const colorList = [
        "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"
    ];
    const color = colorList[stringHash(name) % colorList.length];
    return `bg-${color}-100 dark:bg-${color}-900 border-${color}-300 dark:border-${color}-600 text-${color}-500 dark:text-${color}-400`
}
function SingleCourt(props: { preference: Preference, deletable?: boolean, deleteSelf: () => void, setPreference: (pref: Preference) => void }) {

    const [startTime, setStartTime] = useState(props.preference.StartTimeSec);
    const [duration, setDuration] = useState(props.preference.DurationSec);
    const [newCourtName, setNewCourtName] = useState("");
    const [courtNames, setCourtNames] = useState(props.preference.CourtNamePreference);


    return (
        <div className="relative flex flex-col p-4 mb-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600">
            {props.deletable && <button className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-sm bg-red-400 text-white opacity-50 hover:opacity-100 font-bold" onClick={(e) => {
                e.preventDefault();
                props.deleteSelf();
            }}>✕</button>}
            <label className="uppercase text-sm tracking-wider">Start Time</label>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-2">
                System will try to reserve all time segments which has non-zero intersection with the time period you assigned.
            </p>
            <input name="time" type="time" value={formatTime(startTime)} onChange={(e) => {
                const newStartTime = parseTime(e.target.value)
                setStartTime(newStartTime);
                props.setPreference({
                    StartTimeSec: newStartTime,
                    DurationSec: duration,
                    CourtNamePreference: courtNames
                })
            }} step={1800} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-8 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600"/>
            <label className="uppercase text-sm tracking-wider">Duration</label>
            <p className="text-xl my-2">{formatDuration(duration)}</p>
            <input className="mb-6" type="range" min={1800} max={14400} step={1800} value={duration} onChange={(e) => {
                const newDuration = parseInt(e.target.value);
                setDuration(newDuration);
                props.setPreference({
                    StartTimeSec: startTime,
                    DurationSec: newDuration,
                    CourtNamePreference: courtNames
                })
            }} />

            <label className="uppercase text-sm tracking-wider">Preferred Court Names</label>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-2">
                Example: 场地1. System will try to reserve courts with the exact same name; if no name matches, all courts are available for booking.
            </p>
            <div className="flex flex-wrap mb-2 gap-4">{
                courtNames.map((c) => (<div key={c} className={`relative uppercase text-xs font-bold px-1 py-0.5 rounded-md border-2 ${randomTagStyle(c)}`}>
                    <button 
                        className="absolute -top-1 -right-3 w-4 h-4 rounded-full text-xs bg-red-400 text-white opacity-50 hover:opacity-100 font-bold"
                        onClick={(e) => {
                            e.preventDefault();
                            setCourtNames((oldCourtNames) => {
                                return oldCourtNames.filter((v) => v !== c)
                            })
                            props.setPreference({
                                StartTimeSec: startTime,
                                DurationSec: duration,
                                CourtNamePreference: courtNames.filter((v) => v !== c)
                            })
                        }}
                    >✕</button>
                    {c}
                    </div>))
            }</div>
            <div className="flex mt-1 mb-4">
                <input type="text"
                    value={newCourtName}
                    onChange={(e) => setNewCourtName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            if (newCourtName !== "" && !courtNames.includes(newCourtName)) {
                                setCourtNames((oldCourtNames) => {
                                    const ans: string[] = [];
                                    for (const v of oldCourtNames) {
                                        ans.push(v)
                                    }
                                    ans.push(newCourtName);
                                    return ans;
                                })

                                const ans: string[] = [];
                                for (const v of courtNames) {
                                    ans.push(v)
                                }
                                ans.push(newCourtName);

                                props.setPreference({
                                    StartTimeSec: startTime,
                                    DurationSec: duration,
                                    CourtNamePreference: ans
                                })
                            }
                            setNewCourtName("");
                        }
                    }}
                    className="p-1 rounded-md outline-none border-2 border-transparent focus:border-blue-400 bg-gray-50 dark:bg-zinc-600 flex-1 invalid:border-red-400" />
                <button className="py-1 px-2 rounded-md ml-2 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-500 dark:hover:bg-slate-400 invalid:border-red-400" onClick={(e) => {
                    e.preventDefault();
                    if (newCourtName !== "" && !courtNames.includes(newCourtName)) {
                        setCourtNames((oldCourtNames) => {
                            const ans: string[] = [];
                            for (const v of oldCourtNames) {
                                ans.push(v)
                            }
                            ans.push(newCourtName);
                            return ans;
                        })

                        const ans: string[] = [];
                        for (const v of courtNames) {
                            ans.push(v)
                        }
                        ans.push(newCourtName);

                        props.setPreference({
                            StartTimeSec: startTime,
                            DurationSec: duration,
                            CourtNamePreference: ans
                        })
                    }
                    setNewCourtName("");
                }}>Add</button>
            </div>
        </div>
    )
}

function Reservation() {

    const today = new Date();
    const timezone = 8 // UTC+8
    const todayLocal = new Date(today.getTime() + (timezone * 60 * 60 * 1000))
    const localFmt = todayLocal.toISOString().split('T')[0]

    const [errorMsg, setErrorMsg] = useState<string>();
    const [site, setSite] = useState(82);
    const [date, setDate] = useState(localFmt);
    const [priority, setPriority] = useState(3);
    const [invalidPriority, setInvalidPriority] = useState("3");
    const [preferences, setPreferences] = useState<{ id: number, pref: Preference }[]>([IdClosure.getNewIdPref()]);
    useEffect(() => {
        const params = new URLSearchParams(document.location.search)
        const res_str = params.get("reservation")
        if (!res_str) {
            return
        }
        try {
            const reservation: ReserveRequest = JSON.parse(decodeURI(res_str))
            setPreferences(reservation.Preferences.map((pref) => {
                const {id} = IdClosure.getNewIdPref()
                return ({id, pref})
            }))
            setDate("0000-00-00")
            setSite(reservation.Site)
            setPriority(reservation.Priority)
        } catch(e) {

        }
    }, [])
    return (<div className="w-full">
        <h1 className="text-slate-900 dark:text-white text-2xl my-5">Reserve a new court</h1>
        <form action="post" onSubmit={async (e) => await placeReservation(e, {
            Date: date,
            Site: site,
            Preferences: preferences.map((t) => t.pref),
            Priority: priority
        }, setErrorMsg)}>
            <div className="flex flex-col px-6 py-3 box-border rounded-lg shadow-lg bg-white dark:bg-zinc-700">
                <div className="flex flex-col lg:flex-row lg:justify-between my-5 gap-16">
                    <div className="flex flex-col flex-1">
                        <h3 className="text-slate-700 dark:text-gray-200 text-xl mb-8">Basic Information</h3>
                        <label htmlFor="place" className="uppercase text-sm tracking-wider">Sport Site</label>
                        <select name="place" id="place" value={site} onChange={(e) => setSite(parseInt(e.target.value))} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-8 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600 invalid:border-red-400">
                            {sites.map(({name, id}) => <option key={id} value={id}>{name}</option>)}
                        </select>
                        <label htmlFor="date" className="uppercase text-sm tracking-wider">Date</label>
                        <input required name="date" id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={localFmt}
                            className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-8 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600 invalid:border-red-400"/>
                        <label htmlFor="priority" className="uppercase text-sm tracking-wider">Priority</label>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-2">
                            Only apply to your account. System will try to book the one with the highest priority (lowest priority number).
                        </p>
                        <div id="priority" className="flex mt-1 mb-8">
                            
                            <button disabled={priority == 0} onClick={(e) => { e.preventDefault(); setPriority(0); setInvalidPriority("0"); } } className="flex-1 p-2 bg-none border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:bg-red-100 disabled:dark:bg-red-900 border-y-2 disabled:border-red-300 disabled:dark:border-red-600 disabled:text-red-500 disabled:dark:text-red-400 border-l-2 rounded-l-xl">Critical</button>
                            <button disabled={priority == 1} onClick={(e) => { e.preventDefault(); setPriority(1); setInvalidPriority("1"); } } className="flex-1 p-2 bg-none border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:bg-orange-100 disabled:dark:bg-orange-900 border-y-2 disabled:border-orange-300 disabled:dark:border-orange-600 disabled:text-orange-500 disabled:dark:text-orange-400">High</button>
                            <button disabled={priority == 2} onClick={(e) => { e.preventDefault(); setPriority(2); setInvalidPriority("2"); } } className="flex-1 p-2 bg-none border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:bg-yellow-100 disabled:dark:bg-yellow-900 border-y-2 disabled:border-yellow-300 disabled:dark:border-yellow-600 disabled:text-yellow-500 disabled:dark:text-yellow-400">Moderate</button>
                            <button disabled={priority == 3} onClick={(e) => { e.preventDefault(); setPriority(3); setInvalidPriority("3"); } } className="flex-1 p-2 bg-none border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:bg-blue-100 disabled:dark:bg-blue-900 border-y-2 disabled:border-blue-300 disabled:dark:border-blue-600 disabled:text-blue-500 disabled:dark:text-blue-400">Normal</button>
                            <button disabled={priority >= 4} onClick={(e) => { e.preventDefault(); setPriority(4); setInvalidPriority("4"); } } className="flex-1 p-2 bg-none border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:bg-gray-100 disabled:dark:bg-gray-900 border-y-2 disabled:border-gray-300 disabled:dark:border-gray-600 disabled:text-gray-500 disabled:dark:text-gray-400 border-r-2 rounded-r-xl ">Low</button>
                        </div>
                        {
                            priority >= 4 && (<div className="flex flex-col">
                                <label htmlFor="custom-priority" className="uppercase text-sm tracking-wider">Custom Priority</label>
                                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-2">
                                    Specify your custom priority here. Lower the value is, higher the priority of booking. 0 is critical, 3 is normal, and higher value is low.
                                    </p>
                                <input name="custom-priority" id="custom-priority" type="number" value={invalidPriority} onChange={(e) => {
                                    setInvalidPriority(e.target.value)
                                    if (e.target.value !== "")
                                        setPriority(parseInt(e.target.value))
                                }} min={4} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-8 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600 invalid:border-red-400"/>
                            </div>)
                        }
                    </div>
                    <div className="flex flex-col flex-1">
                        <h3 className="text-slate-700 dark:text-gray-200 text-xl">Preferred Courts</h3>

                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-8">
                            At most one of the following preferred courts will be reserved. System will try to reserve the one at front. If you want to reserve many courts at a time, please place multiple reservations.
                        </p>
                        {
                            preferences.map((v, i) => (<SingleCourt
                                key={v.id}
                                deletable={preferences.length > 1}
                                preference={v.pref}
                                deleteSelf={() => setPreferences((original) => {
                                    return original.filter((_, p_i) => p_i !== i)
                                })}
                                setPreference={(pref) => {
                                    setPreferences((oldPreferences) => {
                                        return oldPreferences.map((oldP, p_i) => {
                                            if (p_i === i) {
                                                const newP = oldP;
                                                newP.pref = pref;
                                                return newP
                                            } else {
                                                return oldP;
                                            }
                                        })
                                    })
                                }}
                            />))
                        }
                        <button onClick={(e) => {
                            e.preventDefault()
                            setPreferences((original) => {
                                const ans: { id: number, pref: Preference }[] = []
                                for (const v of original) {
                                    ans.push(v)
                                }
                                ans.push(IdClosure.getNewIdPref())
                                return ans
                            })
                        }} className="my-4 flex self-center items-center justify-center text-3xl w-8 h-8 rounded-full uppercase tracking-wider bg-gray-200 dark:bg-zinc-600">+</button>
                    </div>
                </div>
                <div className="flex justify-end">
                <input type="submit" className="py-2 px-8 cursor-pointer mt-12 mb-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white" value="Submit" />
                </div>
            </div>
        { errorMsg && <div className="tex-red-600 dark:text-red-400">{errorMsg}</div> }
        </form>
    </div>)
}

export default Reservation;