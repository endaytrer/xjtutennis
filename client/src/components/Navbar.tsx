import { useState, useEffect } from "react";

import { dialog } from "./Dialog";
import { Link } from "react-router";
import { request } from "../request";

import dashboardIcon from "../assets/dashboard.svg";
import reserveIcon from "../assets/book.svg";
// import peopleIcon from "../assets/people.svg";
import accountIcon from "../assets/account.svg";
import darkLogo from "../assets/dark-logo-8x.png";
import signOut from "../assets/exit.svg";
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
      {/* <Link
        to="/people"
        onClick={() => props.setIsMenuOpen(false)}
        className="h-6 flex flex-row items-center gap-2"
      >
        <img src={peopleIcon} alt="" className="h-full" />
        People
      </Link> */}
    </>
  );
}

export default function Navbar({ user, netid }: { user: string, netid: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const closeMenu = () => setIsDropdownOpen(false);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [isDropdownOpen]);

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

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="h-8 w-8 flex flex-row rounded-full items-center justify-center hover:bg-blue-600 dark:hover:bg-sky-800 transition-colors"
          aria-expanded={isDropdownOpen}
        >
          <img src={accountIcon} alt="" className="h-8" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-xl py-1 bg-white dark:bg-zinc-800 ring-1 ring-black ring-opacity-5 z-50">
            <div className="px-4 pt-2 pb-4 flex flex-col items-start gap-1">
              <div className="font-bold text-lg">Hi, {user}!</div>
              <div className="font-semibold text-sm text-gray-600 dark:text-zinc-500">NetID: {netid}</div>
            </div>
            <Link
              to="/settings"
              onClick={() => setIsDropdownOpen(false)}
              className="block px-4 py-2 text-base text-gray-700 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors w-full text-left"
            >
              Settings
            </Link>
            <hr className="border-zinc-200 dark:border-zinc-700 my-1" />
            <button
              onClick={async () => {
                setIsDropdownOpen(false);
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
              className="flex items-center gap-2 px-4 py-2 text-base text-gray-700 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors w-full text-left"
            >
              <img src={signOut} alt="" className="h-5" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {isMenuOpen && (
        <div className="absolute md:hidden top-full left-0 w-full bg-blue-500 dark:bg-sky-900 p-4 pt-6 -mt-3 rounded-b-xl shadow-lg">
          <div className="flex flex-col gap-4 uppercase font-sans font-bold">
            <NavbarLinks setIsMenuOpen={setIsMenuOpen} />
          </div>
        </div>
      )}
    </nav>
  );
}
