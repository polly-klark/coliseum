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
        <Button
          color="primary"
          variant="outlined"
          onClick={() => fetchData("modified")}
        >
          Ваши атаки
        </Button>
        <Button
          color="danger"
          variant="outlined"
          onClick={() => fetchData("attack")}
        >
          Шаблоны атак
        </Button>
        <Button
          color="purple"
          variant="outlined"
          onClick={() => fetchData("background")}
        >
          Фоновый трафик
        </Button>
      </div>
      <div className="home_container">
        {data ? <div>{JSON.stringify(data)}</div> : <p>Нет данных</p>}
      </div>
    </>
  );
};

export default Dashboard;
