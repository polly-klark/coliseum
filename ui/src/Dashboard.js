import React from "react";
import axios from "axios";
import { Button, Divider, Table, Space } from "antd";
import "./App.css"; // Импорт вашего CSS файла
import ModTable from "./Tables/ModTable";
import AttackTable from "./Tables/AttackTable";
import BgTable from "./Tables/BgTable";


const Dashboard = ({ token }) => {
  const [data, setData] = React.useState([]);
  const fetchData = async (dir) => {
    try {
      const response = await axios.get(`http://localhost:8000/${dir}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (error) {
      console.error("Ошибка при получении данных:", error);
      setData([]); // В случае ошибки устанавливаем пустой массив
    }
  };
  return (
    <>
      <div className="home_container">
        <Button
          color="danger"
          variant="outlined"
          onClick={() => fetchData("modified")}
        >
          Ваши атаки
        </Button>
        <Button
          color="primary"
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
      <Divider />
      {/* <div className="home_container">
        {data ? <div>{JSON.stringify(data)}</div> : <p>Нет данных</p>}
      </div> */}
      <ModTable data={data} />
      <AttackTable data={data} />
      <BgTable data={data} />
    </>
  );
};

export default Dashboard;
