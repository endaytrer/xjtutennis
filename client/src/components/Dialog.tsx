
import { createRoot } from "react-dom/client";

function Dialog(props: {type: "Info" | "Confirm" | "Cancellable", title: string, message: string, confirm: () => void, reject: () => void, cancel: () => void}) {
    const {type, title, message, confirm, reject, cancel} = props;
    return <div className="flex flex-col gap-8 justify-between bg-zinc-100 dark:bg-zinc-900 border-solid border border-zinc-300 dark:border-zinc-700 shadow-lg rounded-xl p-2">
        <h1 className="font-bold text-xl mx-4 mt-4 -mb-2">{title}</h1>
        <p className="mx-4">{message}</p>
        <div className="flex gap-2 w-full justify-between">
            {type === "Cancellable" && <button className="flex-1 bg-gray-500 text-white rounded-md py-2" onClick={cancel}>Cancel</button>}
            {type !== "Info" && <button className="flex-1 bg-red-400 dark:bg-red-500 text-white rounded-md py-2" onClick={reject}>No</button>}
            <button className="flex-1 bg-blue-400 dark:bg-blue-500 text-white rounded-md py-2" onClick={confirm}>{type === "Info" ? "OK" : "Yes"}</button>
        </div>
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
        dialogContainer.onclick = () => {
            dialogRoot.unmount()
            dialogContainer.classList.add("hidden");
            dialogContainer.classList.remove("flex");
            res(undefined)
        }
    })
}