import React, { useEffect, useState } from "react";
import { request, RequestErr } from "../request";

import logo from "../assets/regular-no-gradient-8x.png"
import darkLogo from "../assets/dark-logo-8x.png"
import { dialog } from "../components/Dialog";
import PinInput from "../components/PinInput";
import { escapeRegExp } from "../utils";

async function signup(e: React.FormEvent, InvitationCode: string, User: string, Passwd: string, NetId: string, NetIdPasswd: string, PaymentPasswd: string | null, setErrorMsg: (msg: string) => void) {
    e.preventDefault();
    try {
        await request("/signup", "POST", undefined, {
            User,
            Passwd,
            NetId,
            NetIdPasswd,
            PaymentPasswd,
            InvitationCode,
        });
        window.location.href = "/dashboard"
    } catch(error) {
        if (error instanceof RequestErr) {
            setErrorMsg(error.message)
        } else {
            setErrorMsg("Service is temporally unavailable!")
        }
    }
    // try {
    //     await request("/login", "POST", undefined, { User, Passwd });
    //     window.location.href = "/dashboard";
    // } catch(error) {
    //     if (error instanceof RequestErr) {
    //         setErrorMsg(error.message)
    //     } else {
    //         setErrorMsg("Service is temporally unavailable!")
    //     }
    // }
}

export default function SignUp() {
    const [invitationCode, setInvitationCode] = useState("");
    const [username, setUsername] = useState("");
    const [passwd, setPasswd] = useState("");
    const [passwdRepeat, setPasswdRepeat] = useState("");
    const [netId, setNetId] = useState("");
    const [netIdPasswd, setNetIdPasswd] = useState("");
    const [netIdPasswdRepeat, setNetIdPasswdRepeat] = useState("");
    const [paymentPasswd, setPaymentPasswd] = useState("");
    const [errorMsg, setErrorMsg] = useState<string>();
    useEffect(() => {

        const params = new URLSearchParams(document.location.search)
        const code = params.get("code")
        if (code === null) {
            window.location.href = "/"
            return
        }

        request("/invitation", "GET", {
            Code: code
        }).then((valid: boolean) => {
            if (!valid) {
                window.location.href = "/"
            } else {
                setInvitationCode(code)
                return
            }
        }).catch((e) => {
            dialog("Info", "Error", `Service is temporally unavailable: ${e}`).finally(() => {
                window.location.href = "/"
            }
        );
        })
    })
    return (
        <>
        <main className="flex items-center justify-center min-h-screen">
        <form action="post" onSubmit={async (e) => await signup(e, invitationCode, username, passwd, netId, netIdPasswd, paymentPasswd.length === 6 ? paymentPasswd : null, setErrorMsg)} className="flex flex-col lg:flex-row gap-4 lg:gap-16 h-fit box-border p-8 m-5 rounded-2xl shadow-lg bg-white dark:bg-slate-700">
            <div className="flex flex-col w-full max-w-xl">
                <h1 className="text-xl font-bold uppercase mt-2 mb-6 h-10 -ml-3 flex items-center">
                    
                    <img src={logo} alt="XJTUTennis" className="h-full dark:hidden" />
                    <img src={darkLogo} alt="XJTUTennis" className="h-full hidden dark:inline" />
                    
                </h1>
                <br />
                <div className="flex flex-col my-5">
                    <h1 className="text-xl font-bold mt-4 mb-6">Sign Up</h1>
                    <label htmlFor="username" className="text-md mt-2">Username<sup className="text-red-600 dark:text-red-400">*</sup></label>
                    <input type="text" required className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="username" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />

                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                        A unique username for login.
                    </p>

                    <label htmlFor="password" className="text-md mt-2">Password<sup className="text-red-600 dark:text-red-400">*</sup></label>

                    <input type="password" required maxLength={72} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="passwd" id="password" value={passwd} onChange={(e) => {
                        setPasswd(e.target.value)

                        if (e.target.value !== passwdRepeat) {
                            setErrorMsg("Password not match!")
                        } else {
                            setErrorMsg(undefined)
                        }
                    }}/>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                        The password for you to login. The password should not be longer than 72 characters.
                    </p>

                    <label htmlFor="password-repeat"  className="text-md mt-2">Repeat Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
                    <input type="password" required maxLength={72} pattern={escapeRegExp(passwd)}className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="passwd-repeat" id="password-repeat" value={passwdRepeat} onChange={(e) => {
                        setPasswdRepeat(e.target.value)

                        if (e.target.value !== passwd) {
                            setErrorMsg("Password not match!")
                        } else {
                            setErrorMsg(undefined)
                        }
                    }}/>
                </div>
            </div>
            <div className="flex flex-col my-5 w-full max-w-xl">

                <label htmlFor="netid" className="text-md mt-2">NetID<sup className="text-red-600 dark:text-red-400">*</sup></label>
                <input type="text" required className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="netid" id="netid" value={netId} onChange={(e) => setNetId(e.target.value)}/>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                    The NetID for XJTU Login Authentication, e.g. "3124100000".
                    NetID is stored <b>in plain text</b> to identify and block malicious users. If you do not want to share your NetID with the maintainer, please do not sign in.
                </p>

                <label htmlFor="netid-passwd" className="text-md mt-2">NetID Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
                <input type="password" required className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="netid-passwd" id="netid-passwd" value={netIdPasswd} onChange={(e) => {
                    setNetIdPasswd(e.target.value)

                    if (e.target.value !== netIdPasswdRepeat) {
                        setErrorMsg("NetId password not match!")
                    } else {
                        setErrorMsg(undefined)
                    }
                }}/>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    XJTU NetID Password. The NetID password is encrypted by your login password, and no one can know your NetID password including the maintainer of the platform.
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                    However, if the server is held on HTTP protocol instead of HTTPS, there could be man-in-the-middle (MITM) attack to get your password. Be aware of this.
                </p>

                <label htmlFor="netid-passwd-repeat" className="text-md mt-2">Repeat NetID Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
                <input type="password" required pattern={escapeRegExp(netIdPasswd)}  className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="netid-passwd-repeat" id="netid-passwd-repeat" value={netIdPasswdRepeat} onChange={(e) => {
                    setNetIdPasswdRepeat(e.target.value)
                    if (e.target.value !== netIdPasswd) {
                        setErrorMsg("NetId password not match!")
                    } else {
                        setErrorMsg(undefined)
                    }
                }}/>
                

                <label htmlFor="payment" className="text-md mt-2">Payment Password</label>
                <div className="self-center my-3 flex gap-2">
                    <PinInput show={false} value={paymentPasswd} onChange={(newVal) => {setPaymentPasswd(newVal)}}/>
                </div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    The payment password of your XJTU student / faculty card, usually is a 6-digit PIN. Payment password is not required for payed courts, as long as your payment did not exceed the limit.
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                    Like NetID password, payment password is also encrypted by your login password. However, if the server is held on HTTP protocol instead of HTTPS, there could be man-in-the-middle (MITM) attack to get your password. Be aware of this.
                </p>

                { errorMsg && <div className="text-red-600 dark:text-red-400">{errorMsg}</div> }
                <input type="submit" className="p-2  cursor-pointer mt-12 rounded-full bg-slate-500 hover:bg-slate-400 text-white" value="Sign Up" />
            </div>
        </form>
        </main>
        </>
    )
}
