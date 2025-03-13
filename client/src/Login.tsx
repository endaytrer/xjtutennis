import React, { useEffect, useState } from "react";
import { request, RequestErr } from "./request";

import logo from "./assets/regular-no-gradient-8x.png"
import darkLogo from "./assets/dark-logo-8x.png"
import icon from "./assets/icon-8x.png"

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
    useEffect(() => {
        request("/login", "GET").then((resp) => {
            console.log(resp)
            window.location.href = "/dashboard"
        }).catch((_) => {})
    })
    const [username, setUsername] = useState("");
    const [passwd, setPasswd] = useState("");
    const [errorMsg, setErrorMsg] = useState<string>();
    return (
        <>
        <main className="flex items-center justify-center h-screen">
        <form action="post" onSubmit={async (e) => await login(e, username, passwd, setErrorMsg)} className="flex flex-col w-full max-w-xl h-fit box-border p-8 m-5 rounded-2xl shadow-lg bg-white dark:bg-slate-700">
            <h1 className=" text-xl font-bold uppercase mt-2 mb-6 h-10 -ml-3">
                
                <img src={logo} alt="XJTUTennis" className="h-full dark:hidden" />
                <img src={darkLogo} alt="XJTUTennis" className="h-full hidden dark:block" />
            </h1>
            <br />
            <div className="flex flex-col my-5">
            <label htmlFor="username" className="uppercase text-sm tracking-wider">Username</label>
            <input type="text" className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-gray-50 dark:bg-slate-600" name="username" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <label htmlFor="password" className="uppercase text-sm tracking-wider">Password</label>
            <input type="password" className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-gray-50 dark:bg-slate-600" name="passwd" id="password" value={passwd} onChange={(e) => setPasswd(e.target.value)}/>
            <br />
            { errorMsg && <div className="tex-red-600 dark:text-red-400">{errorMsg}</div> }
            <input type="submit" className="p-2  cursor-pointer mt-12 rounded-full bg-slate-500 hover:bg-slate-400 text-white" value="Login" />
            </div>
        </form>
        </main>
        </>
    )
}

export default Login;