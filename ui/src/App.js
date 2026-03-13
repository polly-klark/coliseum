import React, { useState } from "react";
import Login from "./Login";
import OutDashboard from "./Dashboard";

const App = () => {
  const [token, setToken] = useState("");

  return (
    <div>
      {!token ? <Login setToken={setToken} /> : <OutDashboard token={token} />}
    </div>
  );
};

export default App;
