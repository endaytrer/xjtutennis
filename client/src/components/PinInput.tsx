import { useEffect, useState } from "react";
import "./pininput.css"
export default function PinInput({show, value, onChange}: {show: boolean, value: string, onChange: (newVal: string) => void}) {
    const [cursor, setCursor] = useState(0);
    const [data, setData] = useState("      ");
    useEffect(() => {
        setCursor(value.length)
        setData((value + "      ").slice(0, 6))
    }, [value])
    return <button
        className={`pin-input flex w-fit mt-1 mb-1 gap-1 border-2 rounded-lg outline-none border-transparent ${cursor === 6 ? "full" : ""}`}
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => {
            switch (e.key) {
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                case "0":
                    if (cursor <= 5) {
                        onChange(data.slice(0, cursor) + e.key)
                        setData((data) => data.slice(0, cursor) + e.key + data.slice(cursor + 1, 6))
                        setCursor((c) => Math.min(c + 1, 6))
                    }
                    break
                case "Backspace":
                    if (cursor > 0) {
                        onChange(data.slice(0, cursor - 1))
                        setData((data) => data.slice(0, cursor - 1) + " " + data.slice(cursor, 6))
                        setCursor((t) => Math.max(t - 1, 0))
                    }
                    break
            }
        }}
    >

        {
            data.split("").map((val, idx) => <div key={idx}
                className={`pin-digit p-1 rounded-md outline-none border-2 border-transparent text-xl flex items-center justify-center bg-gray-50 dark:bg-slate-600 w-8 h-10 ${cursor === idx ? "current" : ""}`}
                style={{
                    borderTopRightRadius: idx != 5 ? "2px" : "6px",
                    borderBottomRightRadius: idx != 5 ? "2px" : "6px",
                    borderTopLeftRadius: idx != 0 ? "2px" : "6px",
                    borderBottomLeftRadius: idx != 0 ? "2px" : "6px",
                }} >{show ? val : (val === " " ? " " : "\u25cf")}</div>
            )
        }
    </button>
}