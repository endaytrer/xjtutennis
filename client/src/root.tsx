import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";
import { DialogContainer } from "./components/Dialog";

export function Layout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
    <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>xjtutennis</title>
      <Meta />
      <Links />
    </head>
    <body className="bg-zinc-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
      <DialogContainer />
      {children}
      <ScrollRestoration />
      <Scripts />
    </body>
  </html>
  );
}
export default function Root() {
    return <Outlet />
}