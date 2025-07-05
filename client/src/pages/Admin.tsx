import { useEffect, useState } from "react"
import { request, RequestErr } from "../request"

export default function Admin() {
    const [rootAdminToken, setRootAdminToken] = useState("");
    const [invitationCode, setInvitationCode] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    useEffect(() => {

        const params = new URLSearchParams(document.location.search)
        const token = params.get("token")
        if (token === null) {
            window.location.href="/"
            return
        }
        
        request("/admin/token", "GET", {
            Token: token
        }).then((resp: boolean) => {
            if (!resp) {
                window.location.href="/"
                return
            }
            setRootAdminToken(token)
        })
    })
    return <div className="m-10">

        <h1 className="text-xl font-bold">XJTUTennis Root Administrator Panel</h1>
        <div>
            <h2 className="my-2 text-lg">Welcome, root admin!</h2>
            <hr className="border-zinc-200 dark:border-zinc-700" />
            <h3 className="my-2 font-semibold">Create a new invitation</h3>
            
            <div>
                <input readOnly type="text" className="bg-zinc-200 dark:bg-zinc-700 p-1 rounded-md w-96" value={invitationCode}/>
                <button className="bg-blue-600 text-white rounded-md p-1 ml-2"
                    onClick={async () => {
                        try {
                            const resp: string = await request("/admin/invitation", "POST", undefined, {
                                Token: rootAdminToken,
                            })
                            const url = new URL(window.location.href)
                            
                            setInvitationCode(url.origin + "/signup?code=" + resp)
                            navigator.clipboard.writeText(url.origin + "/signup?code=" + resp)
                        } catch(e) {
                            if (e instanceof RequestErr) {
                                setErrorMsg(e.message)
                            } else {
                                setErrorMsg(String(e))
                            }
                        }
                    }}>Create</button>
            </div>
            { errorMsg && <div className="tex-red-600 dark:text-red-400">{errorMsg}</div> }
        </div>
    </div>
}