import React from "react";
import axios from "axios";
import { Button, Divider, Table, Space } from "antd";
import "./App.css"; // Импорт вашего CSS файла
import ModTable from "./Tables/ModTable";
import AttackTable from "./Tables/AttackTable";
import BgTable from "./Tables/BgTable";

const Dashboard = ({ token }) => {
  const [data, setData] = React.useState([]);
  const [activeTable, setActiveTable] = React.useState(null); // Состояние для активной таблицы
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

  const handleButtonClick = (dir, table) => {
    fetchData(dir); // Получаем данные
    setActiveTable(table); // Устанавливаем активную таблицу
  };

  return (
    <>
      <div className="home_container">
        <Button
          color="danger"
          variant="outlined"
          onClick={() => handleButtonClick("modified", "mod")}
        >
          Ваши атаки
        </Button>
        <Button
          color="primary"
          variant="outlined"
          onClick={() => handleButtonClick("attack", "attack")}
        >
          Шаблоны атак
        </Button>
        <Button
          color="purple"
          variant="outlined"
          onClick={() => handleButtonClick("background", "bg")}
        >
          Фоновый трафик
        </Button>
      </div>
      <Divider />
      {/* Условный рендеринг таблиц */}
      {activeTable === "mod" && <ModTable data={data} />}
      {activeTable === "attack" && <AttackTable data={data} />}
      {activeTable === "bg" && <BgTable data={data} />}
    </>
  );
};

export default Dashboard;
