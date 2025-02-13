import React, { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";

const App = () => {
  const [token, setToken] = useState("");

  return (
    <div>
      {!token ? <Login setToken={setToken} /> : <Dashboard token={token} />}
    </div>
  );
};

export default App;
