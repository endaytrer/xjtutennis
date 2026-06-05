import { useEffect, useState } from "react";
import { request } from "../request";
import Navbar from "./Navbar";



function App({ children: Children }: { children: (props: { user: string, netid: string }) => JSX.Element }) {
  const [user, setUser] = useState("ERROR not set")
  const [netid, setNetId] = useState("ERROR not set")

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
      <Navbar user={user} netid={netid} />
      <main className="flex items-start justify-center box-border m-2 p-2 w-full max-w-screen-2xl text-gray-700 dark:text-gray-50">
        <Children user={user} netid={netid} />
      </main>
    </div>
  );
}

export default App;
