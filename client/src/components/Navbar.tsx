import { useState } from "react";

import { changePasswd, dialog } from "./Dialog";
import { Link } from "react-router";
import { request, RequestErr } from "../request";

import dashboardIcon from "../assets/dashboard.svg";
import reserveIcon from "../assets/book.svg";
import peopleIcon from "../assets/people.svg";
import darkLogo from "../assets/dark-logo-8x.png";
import signOut from "../assets/exit.svg";
import signOutDark from "../assets/exit-dark.svg";
import userIcon from "../assets/user.svg";
import userGray from "../assets/user-gray.svg";
import menuIcon from "../assets/menu.svg";

async function signout() {
  try {
    await request("/login", "DELETE");
    window.location.href = "/";
  } catch (e) {
    console.log(e);
  }
}
function NavbarLinks(props: { setIsMenuOpen: (_: boolean) => void }) {
  return (
    <>
      <Link
        to="/dashboard"
        onClick={() => props.setIsMenuOpen(false)}
        className="h-6 flex flex-row items-center gap-2"
      >
        <img src={dashboardIcon} alt="" className="h-full" />
        Dashboard
      </Link>
      <Link
        to="/reserve"
        onClick={() => props.setIsMenuOpen(false)}
        className="h-6 flex flex-row items-center gap-2"
      >
        <img src={reserveIcon} alt="" className="h-full" />
        Reserve
      </Link>
      <Link
        to="/people"
        onClick={() => props.setIsMenuOpen(false)}
        className="h-6 flex flex-row items-center gap-2"
      >
        <img src={peopleIcon} alt="" className="h-full" />
        People
      </Link>
    </>
  );
}

export default function Navbar({user, netid}: {user: string, netid: string}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  return (
    <nav className="sticky top-3 z-40 shadow-lg w-full min-w-fit m-3 box-border p-2 rounded-xl flex items-center justify-between text-base text-gray-50 bg-blue-500 dark:bg-sky-900">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-3 md:hidden"
      >
        <img src={menuIcon} alt="Menu" className="h-5" />
      </button>
      <div className="flex items-center gap-4">
        <div className="h-10 mx-4">
          <img src={darkLogo} alt="" className="h-full" />
        </div>
        <div className="hidden md:flex items-center gap-6 uppercase font-sans font-bold">
          <NavbarLinks setIsMenuOpen={setIsMenuOpen} />
        </div>
      </div>

      <button

        onClick={() => setIsUserOpen(!isUserOpen)}
        className="h-11 p-2 rounded-md"
      >
        <img src={userIcon} alt="User" className="h-full" />
      </button>

      {isMenuOpen && (
        <div className="absolute md:hidden top-full left-0 w-full bg-blue-500 dark:bg-sky-900 p-4 pt-6 -mt-3 rounded-b-xl shadow-lg">
          <div className="flex flex-col gap-4 uppercase font-sans font-bold">
            <NavbarLinks setIsMenuOpen={setIsMenuOpen} />
          </div>
        </div>
      )}
      {isUserOpen && <div className="absolute top-full right-2 min-w-56 bg-zinc-50 dark:bg-zinc-700 text-gray-600 dark:text-gray-50 -mt-2 rounded-md shadow-lg flex flex-col gap-1 p-3">
        
        <div className="flex items-center gap-2">

        <img src={userGray} alt="User" className="h-11 text-slate-900 dark:text-white rounded-full" />
          <div>
            <h3 className="mt-1 text-lg"><b>{user}</b></h3>
            <h4 className="text-sm mb-2">NetID: {netid}</h4>
          </div>
        </div>
        <hr className="border-zinc-200 dark:border-zinc-600"/>
        <Link to="/user"
        className="h-8 rounded-md flex w-full items-center justify-start"
        >
        <span>View Profile</span>
        </Link>

        <button
        className="h-8 rounded-md flex w-full items-center justify-start"
        onClick={async () => {
          const res = await changePasswd();
          if (res === undefined) {
            return;
          }
          try {
            await request("/passwd", "PUT", undefined, res);
            await dialog("Info", "Info", "Password has been changed successfully.");
            sessionStorage.removeItem("sessionAuthorizePasswd");
          } catch (e) {
            await dialog("Info", "Error", `Password change failed: ${e instanceof RequestErr ? e.message : String(e) }`);
          }
        }}
        >
        <span>Change Password</span>
        </button>
        <hr className="border-zinc-200 dark:border-zinc-600"/>
        <button 
        onClick={async () => {
          if (
            await dialog(
              "Confirm",
              "Sign out",
              "Do you really want to sign out?"
            )
          ) {
            await signout();
          }
        }}
        className="h-8 rounded-md flex w-full items-center justify-start gap-2"
        >

        <img src={signOut} alt="Sign out" className="h-full py-2 hidden dark:block" />
        <img src={signOutDark} alt="Sign out" className="h-full py-2 dark:hidden" />
        <span>Sign Out</span>
        </button>
      </div>}
    </nav>
  );
}
