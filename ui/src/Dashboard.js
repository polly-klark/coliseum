import React from "react";
import axios from "axios";
import { Button, Input } from "antd";
import "./App.css"; // Импорт вашего CSS файла

const Dashboard = ({ token }) => {
  const [data, setData] = React.useState(null);
  const fetchData = async (role) => {
    const response = await axios.get(`http://localhost:8000/${role}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(response.data);
  };
  return (
    <div>
      <button onClick={() => fetchData("admin")}>Get Admin Data</button>
      <button onClick={() => fetchData("user")}>Get User Data</button>
      {data && <div>{JSON.stringify(data)}</div>}
    </div>
  );
};

export default Dashboard;
