import React, { useEffect } from "react";
import axios from "axios";
import { Button, Divider } from "antd";
import "./App.css"; // Импорт вашего CSS файла
import ModTable from "./Tables/ModTable";
import AttackTable from "./Tables/AttackTable";
import BgTable from "./Tables/BgTable";

const Dashboard = ({ token }) => {
  const [user, setUser] = React.useState(null);
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data); // Предполагается, что API возвращает объект с полем username
      } catch (error) {
        console.error("Ошибка при получении данных:", error);
        setUser(null);
      }
    };

    fetchUser(); // Вызываем функцию для получения данных о пользователе
  }, [token]); // Зависимость от token, чтобы обновлять при изменении токена

  return (
    <>
      <header>Вы под пользователем {user ? user : "Загрузка..."}</header>
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
      {activeTable === "attack" && <AttackTable data={data} user={user} />}
      {activeTable === "bg" && <BgTable data={data} user={user} />}
    </>
  );
};

export default Dashboard;
