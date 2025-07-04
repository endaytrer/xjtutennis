
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { escapeRegExp } from "../utils";

function Dialog(props: {type: "Info" | "Confirm" | "Cancellable", title: string, message: string, confirm: () => void, reject: () => void, cancel: () => void}) {
    const {type, title, message, confirm, reject, cancel} = props;
    return <div className="flex flex-col gap-8 justify-between bg-zinc-100 dark:bg-zinc-900 border-solid border border-zinc-300 dark:border-zinc-700 shadow-lg rounded-xl p-2" >
        <h1 className="font-bold text-xl mx-4 mt-4 -mb-2">{title}</h1>
        <p className="mx-4">{message}</p>
        <div className="flex gap-2 w-full justify-between">
            {type === "Cancellable" && <button className="flex-1 bg-gray-500 text-white rounded-md py-2" onClick={cancel}>Cancel</button>}
            {type !== "Info" && <button className="flex-1 bg-red-400 dark:bg-red-500 text-white rounded-md py-2" onClick={reject}>No</button>}
            <button className="flex-1 bg-blue-400 dark:bg-blue-500 text-white rounded-md py-2" onClick={confirm}>{type === "Info" ? "OK" : "Yes"}</button>
        </div>
    </div>
}
function Authorization({confirm, cancel}: {confirm: (passwd: string) => void, cancel: () => void}) {
    const [passwd, setPasswd] = useState("");
    return <div className="flex flex-col gap-8 justify-between bg-zinc-100 dark:bg-zinc-900 border-solid border border-zinc-300 dark:border-zinc-700 shadow-lg rounded-xl p-2" >
        <h1 className="font-bold text-xl mx-4 mt-4 -mb-2">Authorization Required</h1>
        <form onSubmit={(e) => {
            e.preventDefault();
            confirm(passwd)
        }}>
            <div className="flex flex-col gap-2 mx-8">
            <label htmlFor="auth-passwd" className="mb-0 uppercase text-sm tracking-wider">Password</label>
            <input id="auth-passwd" type="password" className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-zinc-50 dark:bg-zinc-700" value={passwd} onChange={(e) => setPasswd(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full justify-between">
                <input type="button" className="flex-1 bg-gray-500 text-white rounded-md py-2 cursor-pointer" value="Cancel" onClick={cancel} />
                <input type="submit" className="flex-1 bg-blue-400 dark:bg-blue-500 text-white rounded-md py-2 cursor-pointer" value="Authorize"/>
            </div>
        </form>
    </div>
}

function ChangePasswd({confirm, cancel}: {confirm: (old_passwd: string, new_passwd: string) => void, cancel: () => void}) {
    const [oldPasswd, setOldPasswd] = useState("");
    const [newPasswd, setNewPasswd] = useState("");
    const [newPasswdRepeat, setNewPasswdRepeat] = useState("");
    return <div className="flex flex-col gap-8 justify-between bg-zinc-100 dark:bg-zinc-900 border-solid border border-zinc-300 dark:border-zinc-700 shadow-lg rounded-xl p-2" >
        <h1 className="font-bold text-xl mx-4 mt-4 -mb-2">Change Password</h1>
        <form onSubmit={(e) => {
            e.preventDefault();
            confirm(oldPasswd, newPasswd)
        }}>
            <div className="flex flex-col gap-2 mx-8">
            <label htmlFor="old-passwd" className="mb-0 uppercase text-sm tracking-wider">Old password:</label>
            <input id="old-passwd" type="password" className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-zinc-50 dark:bg-zinc-700" value={oldPasswd} onChange={(e) => setOldPasswd(e.target.value)} />
            <br />
            <label htmlFor="new-passwd" className="mb-0 uppercase text-sm tracking-wider">New password:</label>
            <input id="new-passwd" type="password" maxLength={72} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 bg-zinc-50 dark:bg-zinc-700" value={newPasswd} onChange={(e) => setNewPasswd(e.target.value)} />
            <label htmlFor="new-passwd-repeat" className="mb-0 uppercase text-sm tracking-wider">Repeat new password:</label>
            <input id="new-passwd-repeat" type="password" maxLength={72} pattern={escapeRegExp(newPasswd)} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-12 focus:border-blue-400 invalid:border-red-400 invalid:focus:border-red-400 bg-zinc-50 dark:bg-zinc-700" value={newPasswdRepeat} onChange={(e) => setNewPasswdRepeat(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full justify-between">
                <input type="button" className="flex-1 bg-gray-500 text-white rounded-md py-2 cursor-pointer" value="Cancel" onClick={cancel} />
                <input type="submit" className="flex-1 bg-blue-400 dark:bg-blue-500 text-white rounded-md py-2 cursor-pointer" value="Confirm"/>
            </div>
        </form>
    </div>
}

export function DialogContainer() {
    return <div id="dialog-container" className="fixed top-0 left-0 w-full h-screen bg-black bg-opacity-30 backdrop-blur-md z-50 hidden items-center justify-center"></div>
}


export async function dialog(type: "Info" | "Confirm" | "Cancellable", title: string, message: string): Promise<boolean | undefined> {
    const dialogContainer = document.getElementById("dialog-container");
    if (dialogContainer === null) {
        throw new Error("no dialog component find")
    }
    const dialogRoot = createRoot(dialogContainer);
    dialogContainer.classList.remove("hidden");
    dialogContainer.classList.add("flex");
    
    return new Promise((res) => {
        
        dialogRoot.render(<Dialog type={type} title={title} message={message} confirm={() => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(true);
        }}  reject={() => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(false);
        }} cancel={() => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(undefined);
        }}/>)
        dialogContainer.onclick = (e) => {
            if (e.target === e.currentTarget) { // must be the outer container that is to be clicked
                dialogRoot.unmount()
                dialogContainer.classList.add("hidden");
                dialogContainer.classList.remove("flex");
                res(undefined)
            }
        }
    })
}

export async function authorize(): Promise<string | undefined> {
    const dialogContainer = document.getElementById("dialog-container");
    if (dialogContainer === null) {
        throw new Error("no dialog component find")
    }
    const dialogRoot = createRoot(dialogContainer);
    dialogContainer.classList.remove("hidden");
    dialogContainer.classList.add("flex");
    
    return new Promise((res) => {
        
        dialogRoot.render(<Authorization confirm={(passwd) => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(passwd);
        }}
        cancel={() => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(undefined);
        }}/>)
        dialogContainer.onclick = (e) => {
            if (e.target === e.currentTarget) { // must be the outer container that is to be clicked
                dialogRoot.unmount()
                dialogContainer.classList.add("hidden");
                dialogContainer.classList.remove("flex");
                res(undefined)
            }
        }
    })
}

export async function changePasswd(): Promise<{OldPasswd: string, NewPasswd: string }| undefined> {
    const dialogContainer = document.getElementById("dialog-container");
    if (dialogContainer === null) {
        throw new Error("no dialog component find")
    }
    const dialogRoot = createRoot(dialogContainer);
    dialogContainer.classList.remove("hidden");
    dialogContainer.classList.add("flex");
    
    return new Promise((res) => {
        
        dialogRoot.render(<ChangePasswd confirm={(OldPasswd, NewPasswd) => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res({OldPasswd, NewPasswd});
        }}
        cancel={() => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(undefined);
        }}/>)
        dialogContainer.onclick = (e) => {
            if (e.target === e.currentTarget) { // must be the outer container that is to be clicked
                dialogRoot.unmount()
                dialogContainer.classList.add("hidden");
                dialogContainer.classList.remove("flex");
                res(undefined)
            }
        }
    })
}