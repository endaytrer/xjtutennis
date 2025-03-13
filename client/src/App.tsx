import { useEffect, useState } from "react";
import { request } from "./request";
import Dashboard from "./Dashboard";
import Reservation from "./Reservation";
import { Routes, Link, Route } from "react-router";
import People from "./People";
import darkLogo from "./assets/dark-logo-8x.png";
import signOut from "./assets/exit.svg";
import dashboardIcon from "./assets/dashboard.svg";
import reserveIcon from "./assets/book.svg";
import peopleIcon from "./assets/people.svg";
import menuIcon from "./assets/menu.svg";
import { dialog } from "./Dialog";

async function signout() {
  try {
    await request("/login", "DELETE");
    window.location.href = "/";
  } catch (e) {
    console.log(e);
  }
}
function NavbarLinks(props: {setIsMenuOpen: (_: boolean) => void }) {
  return <>

<Link
            to="/dashboard"
            onClick={() => props.setIsMenuOpen(false)}
            className="h-6 flex flex-row items-center gap-2"
          >
            <img src={dashboardIcon} alt="" className="h-full" />
            Dashboard
          </Link>
          <Link
            to="/dashboard/reserve"
            onClick={() => props.setIsMenuOpen(false)}
            className="h-6 flex flex-row items-center gap-2"
          >
            <img src={reserveIcon} alt="" className="h-full" />
            Reserve
          </Link>
          <Link
            to="/dashboard/people"
            onClick={() => props.setIsMenuOpen(false)}
            className="h-6 flex flex-row items-center gap-2"
          >
            <img src={peopleIcon} alt="" className="h-full" />
            People
          </Link>
  </>
}
function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <NavbarLinks setIsMenuOpen={setIsMenuOpen}/>
        </div>
      </div>

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
        className="h-11 p-3 rounded-md"
      >
        <img src={signOut} alt="Sign out" className="h-full" />
      </button>

      {isMenuOpen && (
        <div className="absolute md:hidden top-full left-0 w-full bg-blue-500 dark:bg-sky-900 p-4 pt-6 -mt-3 rounded-b-xl shadow-lg">
          <div className="flex flex-col gap-4 uppercase font-sans font-bold">
            <NavbarLinks setIsMenuOpen={setIsMenuOpen}/>
          </div>
        </div>
      )}
    </nav>
  );
};

function App() {
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
  return (
    <div className="relative flex flex-col items-center px-3">
      <Navbar />
      <main className="flex items-start justify-center box-border m-2 p-2 w-full max-w-screen-2xl text-gray-700 dark:text-gray-50">
        <Routes>
          <Route index element={<Dashboard user={user} />} />
          <Route path="/reserve" element={<Reservation />} />
          <Route path="/people" element={<People />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
