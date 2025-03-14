import React, { useEffect, useState } from "react";
import { request, RequestErr } from "./request";

import logo from "./assets/regular-no-gradient-8x.png"
import darkLogo from "./assets/dark-logo-8x.png"
import { Version } from "./api";
import { dialog } from "./Dialog";

async function login(e: React.FormEvent, User: string, Passwd: string, setErrorMsg: (msg: string) => void) {
    e.preventDefault();
    try {
        await request("/login", "POST", undefined, { User, Passwd });
        window.location.href = "/dashboard";
    } catch(error) {
        if (error instanceof RequestErr) {
            setErrorMsg(error.message)
        } else {
            setErrorMsg("Service is temporally unavailable!")
        }
    }
}
function Login() {
    const [username, setUsername] = useState("");
    const [passwd, setPasswd] = useState("");
    const [errorMsg, setErrorMsg] = useState<string>();
    const [version, setVersion] = useState<Version>()
    useEffect(() => {
        request("/login", "GET").then((_) => {
            window.location.href = "/dashboard"
        }).catch((_) => {})
    })
    useEffect(() => {
        request("/version", "GET")
            .then((resp: Version) => { setVersion(resp) })
            .catch(() => {
                dialog("Info", "Error", "Service is temporally unavailable!");
            })
    }, [])
    return (
        <>
        <main className="flex items-center justify-center h-screen">
        <form action="post" onSubmit={async (e) => await login(e, username, passwd, setErrorMsg)} className="flex flex-col w-full max-w-xl h-fit box-border p-8 m-5 rounded-2xl shadow-lg bg-white dark:bg-slate-700">
            <h1 className="text-xl font-bold uppercase mt-2 mb-6 h-10 -ml-3 flex items-center">
                
                <img src={logo} alt="XJTUTennis" className="h-full dark:hidden" />
                <img src={darkLogo} alt="XJTUTennis" className="h-full hidden dark:inline" />

                {
                    version?.MainVersion === "unknown"
                        ? <div className="text-sm text-red-500">- Development Server</div>
                        : (
                            version?.MainVersion.includes("alpha")
                                ? <div className="text-sm text-gray-500">- Alpha Release</div>
                                : <></>
                        )
                }
            </h1>
            <br />
            <div className="flex flex-col my-5">
            <label htmlFor="username" className="uppercase text-sm tracking-wider">Username</label>
            <input type="text" className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-gray-50 dark:bg-slate-600" name="username" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <label htmlFor="password" className="uppercase text-sm tracking-wider">Password</label>
            <input type="password" className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-gray-50 dark:bg-slate-600" name="passwd" id="password" value={passwd} onChange={(e) => setPasswd(e.target.value)}/>
            <br />
            { errorMsg && <div className="text-red-600 dark:text-red-400">{errorMsg}</div> }
            <input type="submit" className="p-2  cursor-pointer mt-12 rounded-full bg-slate-500 hover:bg-slate-400 text-white" value="Login" />
            </div>
            <div className="self-center mt-4 text-xs text-gray-400 dark:text-gray-500">
                <span>XJTUTennis - {version?.MainVersion === "unknown" ? "development server" : version?.MainVersion} {version?.ReserverVersion ? `, with reserver ${version.ReserverVersion}` : ", without reserver"}</span>
                
            </div>
        </form>
        </main>
        </>
    )
}

export default Login;