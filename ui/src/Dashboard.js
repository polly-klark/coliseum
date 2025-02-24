import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Divider } from "antd";
import "./App.css"; // Импорт вашего CSS файла
import ModTable from "./Tables/ModTable";
import AttackTable from "./Tables/AttackTable";
import BgTable from "./Tables/BgTable";

const Dashboard = ({ token }) => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [header, setHeader] = useState("Нажмите на кнопку!");
  const [activeTable, setActiveTable] = useState(null); // Состояние для активной таблицы

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

  const handleButtonClick = async (dir, table, type) => {
    await fetchData(dir); // Получаем данные
    setActiveTable(table); // Устанавливаем активную таблицу
    setHeader(type);
  };

  useEffect(() => {
    if (activeTable === "mod" && data.length > 0) {
      // Обновляем содержимое после загрузки данных для "Ваши атаки"
      // Однако, в данном случае мы используем условный рендеринг вместо content
      console.log("Effect")
    }
    console.log("Effect1")
  }, [data, activeTable]); // Обновляем при изменении данных или активной таблицы

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
    console.log("Effect2")
    fetchUser(); // Вызываем функцию для получения данных о пользователе
  }, [token]); // Зависимость от token, чтобы обновлять при изменении токена

  return (
    <>
      <header>Вы под пользователем {user ? user : "Загрузка..."}</header>
      <div className="home_container">
        <Button
          color="danger"
          variant="outlined"
          onClick={() => handleButtonClick("modified", "mod", "Ваши атаки")}
        >
          Ваши атаки
        </Button>
        <Button
          color="primary"
          variant="outlined"
          onClick={() => handleButtonClick("attack", "attack", "Шаблоны атак")}
        >
          Шаблоны атак
        </Button>
        <Button
          color="purple"
          variant="outlined"
          onClick={() =>
            handleButtonClick("background", "bg", "Фоновый трафик")
          }
        >
          Фоновый трафик
        </Button>
      </div>
      <p style={{ textAlign: "center" }}>{header}</p>
      <Divider />
      {/* Условный рендеринг таблиц */}
      {activeTable === "mod" && data.length > 0 ? (
        <ModTable data={data} user={user} token={token} fetchData={fetchData} />
      ) : activeTable === "mod" ? (
        <p>У вас пока нет атак</p>
      ) : null}
      {activeTable === "attack" && (
        <AttackTable
          data={data}
          user={user}
          token={token}
          fetchData={fetchData}
        />
      )}
      {activeTable === "bg" && (
        <BgTable data={data} user={user} token={token} fetchData={fetchData} />
      )}
    </>
  );
};

export default Dashboard;
