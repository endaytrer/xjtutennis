import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { request } from "../request";



function App(props: {setUser?: (user: string) => void, children: JSX.Element}) {

  const [user, setUser] = useState("ERROR not set");
  const [netid, setNetId] = useState("ERROR not set");
  useEffect(() => {
    request("/login", "GET")
      .catch(() => (window.location.href = "/"))
      .then((resp) => {
        const { User, NetId } = resp;
        setUser(User);
        if (props.setUser !== undefined) props.setUser(User);
        setNetId(NetId);
      });
  }, []);
  return (
    <div className="relative flex flex-col items-center px-3">
      <Navbar user={user} netid={netid}/>
      <main className="flex items-start justify-center box-border m-2 p-2 w-full max-w-screen-2xl text-gray-700 dark:text-gray-50">
        {props.children}
      </main>
    </div>
  );
}

export default App;
