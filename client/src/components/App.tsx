import Navbar from "./Navbar";



function App(props: {children: JSX.Element}) {
  return (
    <div className="relative flex flex-col items-center px-3">
      <Navbar />
      <main className="flex items-start justify-center box-border m-2 p-2 w-full max-w-screen-2xl text-gray-700 dark:text-gray-50">
        {props.children}
      </main>
    </div>
  );
}

export default App;
