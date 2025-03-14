import { type RouteConfig, route } from "@react-router/dev/routes";


//   <Routes>
//     <Route index element={<Login/>} />
//     <Route path="dashboard/*" element={<App/>} />
//   </Routes>
export default [
  // * matches all URLs, the ? makes it optional so it will match / as well
  route("/dashboard", "pages/Dashboard.tsx"),
  route("/reserve", "pages/Reservation.tsx"),
  route("/people", "pages/People.tsx"),
  route("/", "pages/Login.tsx"),
  route("*?", "pages/catchall.tsx"),
] satisfies RouteConfig;
