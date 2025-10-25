import React, { useState } from "react";
import axios from "axios";
import { Button, Input, Form, Checkbox, Col } from "antd";
import "./App.css"; // Импорт вашего CSS файла

const onFinishFailed = (errorInfo) => {
  console.log("Failed:", errorInfo);
};

const Login = ({ setToken }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (values) => {
    const { username, password } = values; // Извлекаем значения из объекта
    try {
      const response = await axios.post(
        "http://192.168.42.129:8000/login",
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
    <div className="login_container">
      <Col span={12} offset={4}>
        <Form
          name="basic"
          labelCol={{
            span: 16,
          }}
          wrapperCol={{
            span: 6,
          }}
          style={{
            maxWidth: 800,
          }}
          initialValues={{
            remember: false,
          }}
          onFinish={handleSubmit}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="Имя пользователя"
            name="username"
            rules={[
              {
                required: true,
                message: "Введите имя пользователя!",
              },
            ]}
          >
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              {
                required: true,
                message: "Введите пароль!",
              },
            ]}
          >
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" label={null}>
            <Checkbox>Запомнить меня</Checkbox>
          </Form.Item>

          <Form.Item label={null}>
            <Button htmlType="submit" color="default" variant="solid">
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Col>
    </div>
  );
};

export default Login;
