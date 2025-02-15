import React from "react";
import axios from "axios";
import { Button } from "antd";
import "./App.css"; // Импорт вашего CSS файла

const Dashboard = ({ token }) => {
  const [data, setData] = React.useState(null);
  const fetchData = async (dir) => {
    const response = await axios.get(`http://localhost:8000/${dir}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(response.data);
  };
  return (
    <>
      <div className="home_container">
        <Button onClick={() => fetchData("adminm")}>Ваши атаки</Button>
        <Button onClick={() => fetchData("attack")}>Шаблоны атак</Button>
        <Button onClick={() => fetchData("background")}>Фоновый трафик</Button>
      </div>
      <div className="home_container">{data ? <div>{JSON.stringify(data)}</div> : <p>Нет данных</p>}</div>
    </>
  );
};

export default Dashboard;
