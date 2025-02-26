import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Divider, Modal, Space, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import "./App.css"; // Импорт вашего CSS файла
import ModTable from "./Tables/ModTable";
import AttackTable from "./Tables/AttackTable";
import BgTable from "./Tables/BgTable";

const { Dragger } = Upload;

const Dashboard = ({ token }) => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [header, setHeader] = useState("Нажмите на кнопку!");
  const [activeTable, setActiveTable] = useState(null); // Состояние для активной таблицы
  const [open, setOpen] = useState(false);
  const [props, setProps] = useState({
    name: "file",
    multiple: true,
    action: '',
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
      console.log(info.fileList);
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  });
  const handleUploadModal = () => {
    setOpen(true);
  };
  const handleCancel = async (dir) => {
    setOpen(false);
    await fetchData(dir);
  };

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

  const handleModalSumbit = async (dir) => {
    await fetchData(dir);
    setOpen(false);
  }

  useEffect(() => {
    if (activeTable === "mod" && data.length > 0) {
      // Обновляем содержимое после загрузки данных для "Ваши атаки"
      // Однако, в данном случае мы используем условный рендеринг вместо content
    }
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
    fetchUser(); // Вызываем функцию для получения данных о пользователе
  }, [token]); // Зависимость от token, чтобы обновлять при изменении токена

  // Обновляем action в зависимости от activeTable
  useEffect(() => {
    if (activeTable === 'attack') {
      setProps(prevProps => ({ ...prevProps, action: 'http://localhost:8000/attack/upload' }));
    } else if (activeTable === 'background') {
      setProps(prevProps => ({ ...prevProps, action: 'http://localhost:8000/background/upload' }));
    }
  }, [activeTable]);

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
            handleButtonClick("background", "background", "Фоновый трафик")
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
        <div className="centered">
          <Space
            direction="vertical"
            size="middle"
            style={{
              display: "flex",
            }}
          >
            <div className="centered">
              <p>У вас пока нет атак.</p>
              <p>Хотите создать из предложенных?</p>
            </div>
            <div className="centered">
              <Button
                color="primary"
                variant="solid"
                onClick={() =>
                  handleButtonClick("attack", "attack", "Шаблоны атак")
                }
              >
                Да!
              </Button>
            </div>
          </Space>
        </div>
      ) : null}
      {activeTable === "attack" && (
        <AttackTable
          data={data}
          user={user}
          token={token}
          fetchData={fetchData}
        />
      )}
      {activeTable === "background" && (
        <BgTable data={data} user={user} token={token} fetchData={fetchData} />
      )}
      {user === "admin" &&
        (activeTable === "background" || activeTable === "attack") && (
          <div className="centered">
            <Button color="default" variant="solid" onClick={handleUploadModal}>
              Загрузить
            </Button>
          </div>
        )}
      <Modal
        open={open}
        title={"Загрузка в " + header}
        onCancel={() => handleCancel(activeTable)}
        footer={
          // <Button
          //   key="back"
          //   color="cyan"
          //   variant="outlined"
          //   onClick={handleCancel}
          // >
          //   Отмена
          // </Button>,
          <Button
            key="sumbit"
            type="primary"
            onClick={() => handleModalSumbit(activeTable)}
          >
            Загрузить
          </Button>
        }
      >
        <div>
          <Dragger {...props}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for a single or bulk upload. Strictly prohibited from
              uploading company data or other banned files.
            </p>
          </Dragger>
        </div>
      </Modal>
    </>
  );
};

export default Dashboard;
