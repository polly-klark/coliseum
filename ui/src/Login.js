import React, { useState } from "react";
import axios from "axios";
import { Button, Input } from "antd";
import "./App.css"; // Импорт вашего CSS файла

const Login = ({ setToken }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault(); // Предотвращаем перезагрузку страницы
    try {
      const response = await axios.post(
        "http://localhost:8000/login",
        new URLSearchParams({
          username,
          password,
        })
      );
      setToken(response.data.access_token); // Устанавливаем токен
    } catch (error) {
      console.error("Ошибка авторизации:", error);
    }
  };

  return (
    <div className="container">
      <form className="form" onSubmit={handleSubmit}>
        <Input
          className="input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <Input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <div className="button-container">
          {/* Добавляем htmlType="submit" */}
          <Button htmlType="submit" color="default" variant="solid">
            Войти
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Login;
