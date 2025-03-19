import { useEffect, useState } from "react";
import { request, RequestErr } from "../request";
import { Preference, ReservationResponse, ReservationStatus } from "../api";
import { formatTime } from "../utils";
import { Link } from "react-router";
import { NextPage, PrevPage, RightArrow } from "../components/icons";
import { dialog } from "../components/Dialog";
import App from "../components/App";

import trashcan from "../assets/trashcan.svg";

function StatusTag(props: { status: number }) {
  if (props.status === 0) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-500 dark:text-blue-400">
        Pending
      </span>
    );
  } else if (props.status === 1) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-600 text-green-500 dark:text-green-400">
        Success
      </span>
    );
  } else if (props.status === 2) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-600 text-orange-500 dark:text-orange-400">
        Need Payment
      </span>
    );
  }
  return (
    <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-600 text-red-500 dark:text-red-400">
      Failed
    </span>
  );
}
function PriorityTag(props: { priority: number }) {
  if (props.priority === 0) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-600 text-red-500 dark:text-red-400">
        Critical
      </span>
    );
  } else if (props.priority === 1) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-600 text-orange-500 dark:text-orange-400">
        High
      </span>
    );
  } else if (props.priority === 2) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-600 text-yellow-500 dark:text-yellow-400">
        Moderate
      </span>
    );
  } else if (props.priority === 3) {
    return (
      <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-500 dark:text-blue-400">
        Normal
      </span>
    );
  }
  return (
    <span className="uppercase text-xs font-bold p-0.5 rounded-md border-2 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
      Low ({props.priority})
    </span>
  );
}
function site(s: number): string {
  switch (s) {
    case 301:
      return "兴庆校区东南网球场";
    case 181:
      return "滚筒自行车骑行";
    case 161:
      return "测试场馆（勿订）";
    case 53:
      return "兴庆校区风雨棚网球场";
    case 42:
      return "兴庆校区文体中心三楼羽毛球场地";
    case 121:
      return "健身房（分时段限流）";
    case 43:
      return "兴庆校区文体中心乒乓球馆";
    case 41:
      return "兴庆校区文体中心一楼羽毛球馆";
    case 55:
      return "兴庆校区文体中心网球馆";
    case 56:
      return "兴庆校区文体中心壁球馆";
    case 82:
      return "创新港主楼网球场";
    case 44:
      return "兴庆校区文体中心一楼健身房";
    case 105:
      return "创新港三号巨构乒乓球台";
    case 103:
      return "创新港二号巨构羽毛球场";
    case 52:
      return "兴庆校区东门网球场";
    case 104:
      return "创新港三号巨构羽毛球场";
    case 102:
      return "创新港一号巨构乒乓球台";
    case 101:
      return "创新港一号巨构羽毛球场";
    case 54:
      return "兴庆校区南门网球场";
    case 51:
      return "医学校区网球场";
    case 50:
      return "雁塔校区财经乒乓球馆";
  }
  return "Unknown Court";
}
function CourtList(props: { prefs: Preference[] }) {
  return (
    <div className="flex flex-col">
      {props.prefs.map((p, i) => {
        const start = p.StartTimeSec;
        let end = p.StartTimeSec + p.DurationSec;
        // plus one day
        const plusOne = end >= 86400;
        if (plusOne) {
          end -= 86400;
        }
        const startFormat = formatTime(start);
        const endFormat = formatTime(end);
        return (
          <table className="flex flex-wrap" key={i}>
            <tbody>
              <tr>
                <td>
                  <code>
                    {startFormat}-{endFormat}
                    {plusOne ? <sup>+1</sup> : <sup>&nbsp;&nbsp;</sup>}
                  </code>
                </td>

                <td className="ml-4">
                  {p.CourtNamePreference.length > 0
                    ? " " + p.CourtNamePreference.join(", ")
                    : "No specific courts"}
                </td>
              </tr>
            </tbody>
          </table>
        );
      })}
    </div>
  );
}

function SuccessfulCourts(props: { courts: Record<string, string> }) {
  const elements: JSX.Element[] = [];
  for (const i in props.courts) {
    elements.push(
      <span key={i}>
        <code>{i}</code>
        &nbsp;&nbsp;
        {props.courts[i]}
      </span>
    );
  }
  return <div className="flex gap-6 items-center">{elements}</div>;
}
function ReservationDetail(props: {
  status: ReservationStatus;
  setErrorMsg: (msg: string) => void;
  setResList: (
    callback: (old: ReservationStatus[]) => ReservationStatus[]
  ) => void;
}) {
  const expandable = props.status.Status.Code !== 0;
  const successful = props.status.Status.Code === 1;
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="relative border-t first:border-t-transparent border-zinc-200 dark:border-zinc-800"
        onClick={() => expandable && setExpanded((old) => !old)}
        style={expandable ? { cursor: "pointer" } : {}}
      >
        <td className="p-3 pr-0 align-top flex justify-center items-center select-none">
          &nbsp;
          {expandable && (
            <span
              className="select-none transition-transform flex items-center justify-center"
              style={{
                transformOrigin: "50% 50%",
                transform: expanded ? "rotate(90deg)" : "",
              }}
            >
              <RightArrow />
            </span>
          )}
          &nbsp;
        </td>
        <td
          className="p-3 align-top select-none"
          style={{
            transition: "padding-bottom 150ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {props.status.Reservation.Date}
        </td>
        <td className="p-3 align-top select-none">
          {site(props.status.Reservation.Site)}
        </td>
        <td className="p-3 align-top select-none">
          <CourtList prefs={props.status.Reservation.Preferences} />
        </td>
        <td className="p-3 align-top select-none">
          <PriorityTag priority={props.status.Reservation.Priority} />
        </td>
        <td className="p-3 align-top select-none">
          <StatusTag status={props.status.Status.Code} />
        </td>
        <td className="p-3 align-top select-none">
          <div className="w-full h-full flex items-center justify-start">
            <Link
              to={`/reserve?reservation=${encodeURI(
                JSON.stringify(props.status.Reservation)
              )}`}
              className="h-7 px-3 inline-flex items-center justify-center rounded-full shadow-md bg-blue-200 dark:bg-blue-700"
            >
              Rebook
            </Link>
            {props.status.Status.Code == 0 && (
              <button
                className="h-7 w-7 p-2 ml-2 inline-flex bg-red-600 rounded-full"
                onClick={async (e) => {
                  e.preventDefault();
                  if (
                    await dialog(
                      "Confirm",
                      "Cancel reservation",
                      "Do you really want to cancel the reservation?"
                    )
                  ) {
                    await cancelReservation(
                      props.status.Uid,
                      props.setErrorMsg,
                      props.setResList
                    );
                  }
                }}
              >
                <img src={trashcan} alt="Delete" className="" />
              </button>
            )}
          </div>
        </td>
      </tr>
      <tr
        className=" w-full p-2 pl-10 bottom-0 left-0 transition-opacity cursor-auto"
        style={{
          opacity: expanded ? 100 : 0,
          display: expanded ? "table-row" : "none",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <td></td>
        <td colSpan={6} className="p-3">
          <h4 className="text-lg text-bold">
            {successful ? "Booking Information" : "Reason"}
          </h4>
          <div className="w-full pb-2 text-zinc-600 dark:text-zinc-300">
            {successful ? (
              <SuccessfulCourts courts={props.status.Status.CourtTime} />
            ) : (
              props.status.Status.Msg
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
async function cancelReservation(
  Uid: number,
  setErrorMsg: (msg: string) => void,
  setResList: (
    callback: (old: ReservationStatus[]) => ReservationStatus[]
  ) => void
) {
  try {
    await request("/reservations", "DELETE", { Uid: Uid.toString() });
    await dialog("Info", "Info", "Cancelled successfully");
    setResList((old) => {
      return old.filter((v) => v.Uid !== Uid);
    });
  } catch (e) {
    if (e instanceof RequestErr) {
      setErrorMsg(e.message);
    } else {
      setErrorMsg(String(e));
    }
  }
}
function Dashboard(props: { user: string }) {
  const [resCount, setResCount] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [resList, setResList] = useState<ReservationStatus[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>();
  useEffect(() => {
    request("/reservations", "GET", {
      Page: `${page}`,
      Limit: `${rowsPerPage}`,
    })
      .catch((e) => {
        if (e instanceof RequestErr) {
          setErrorMsg(e.message);
        } else {
          setErrorMsg(String(e));
        }
      })
      .then((resp: ReservationResponse) => {
        setResList(resp.Result);
        setResCount(resp.Count);
      });
  }, [rowsPerPage, page]);
  return (
    <div className="w-full">
      <h1 className="text-slate-900 dark:text-white text-2xl my-5">
        Welcome, {props.user}!
      </h1>
      <h3 className="text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-2">
        Your reservations
      </h3>
      {errorMsg && (
        <div className="tex-red-600 dark:text-red-400">{errorMsg}</div>
      )}
      <div className="w-full rounded-lg overflow-x-scroll lg:overflow-x-hidden overflow-y-hidden shadow-md bg-zinc-50 dark:bg-zinc-900">
        <table className="w-full" style={{ minWidth: "1024px" }}>
          <colgroup>
            <col className="w-8" />
            <col className="w-32" />
            <col />
            <col />
            <col />
            <col />
            <col className="w-36" />
          </colgroup>
          <thead className="uppercase tracking-wider text-start border-b-4 border-transparent bg-zinc-200 dark:bg-zinc-700">
            <tr>
              <th className="p-3 text-center"></th>
              <th className="p-3 text-start">Date</th>
              <th className="p-3 text-start">Site</th>
              <th className="p-3 text-start">Time & Courts</th>
              <th className="p-3 text-start">Priority</th>
              <th className="p-3 text-start">Status</th>
              <th className="p-3 text-start">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resList.map((v) => (
              <ReservationDetail
                key={v.Uid}
                status={v}
                setErrorMsg={setErrorMsg}
                setResList={setResList}
              />
            ))}
          </tbody>
          <tfoot className="bg-zinc-50 dark:bg-zinc-900 border-t-2 dark:border-zinc-800">
            <tr>
              <td colSpan={7} className="p-3 text-right">
                <div className="flex items-center justify-end gap-4">
                  <div>
                    Rows per page:
                    <select
                      className="bg-transparent cursor-pointer mx-2 px-2 py-1 rounded-md"
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
                        setPage(0);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                  <button
                    className="[&_svg]:disabled:fill-zinc-500"
                    disabled={page === 0}
                    onClick={() => setPage((page) => Math.max(page - 1, 0))}
                  >
                    <PrevPage />
                  </button>
                  <div className="h-6">
                    {page * rowsPerPage + 1} ~{" "}
                    {Math.min((page + 1) * rowsPerPage, resCount)}&nbsp;
                    of&nbsp; {resCount}
                  </div>
                  <button
                    className="[&_svg]:disabled:fill-zinc-500"
                    disabled={page === Math.ceil(resCount / rowsPerPage) - 1}
                    onClick={() =>
                      setPage((page) =>
                        Math.min(
                          page + 1,
                          Math.ceil(resCount / rowsPerPage) - 1
                        )
                      )
                    }
                  >
                    <NextPage />
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
    const [user, setUser] = useState("ERROR not set");
    const [_, setNetId] = useState("ERROR not set");
    useEffect(() => {
      request("/login", "GET")
        .catch(() => (window.location.href = "/"))
        .then((resp) => {
          const { User, NetId } = resp;
          setUser(User);
          setNetId(NetId);
        });
    }, []);
  return <App><Dashboard user={user}></Dashboard></App>
}
