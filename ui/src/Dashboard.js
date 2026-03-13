import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import axios from "axios";
import { Button, Divider, Modal, Space, Upload, message, Statistic, Progress, Flex } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import "./App.css"; // Импорт вашего CSS файла
import ModTable from "./Tables/ModTable";
import AttackTable from "./Tables/AttackTable";
import BgTable from "./Tables/BgTable";

const { Dragger } = Upload;

const { Countdown } = Statistic;

const PlayContext = createContext();

export function PlayProvider({ children }) {
  const [stopFilenameAttack, setStopFilenameAttack] = React.useState("ничего");
  const [deadLineAttack, setDeadLineAttack] = React.useState(0);
  const onFinishAttack = () => {
    setDeadLineAttack(0);
    setRemainingTimeAttack(0);
    setStopFilenameAttack("ничего");
  };
  const [stopFilenameBg, setStopFilenameBg] = React.useState("ничего");
  const [deadLineBg, setDeadLineBg] = React.useState(0);
  const onFinishBg = () => {
    setDeadLineBg(0);
    setRemainingTimeBg(0);
    setStopFilenameBg("ничего");
  };
  const [stopFilenameMod, setStopFilenameMod] = React.useState("ничего");
  const [deadLineMod, setDeadLineMod] = React.useState(0);
  const onFinishMod = () => {
    setDeadLineMod(0);
    setRemainingTimeMod(0);
    setStopFilenameMod("ничего");
    setPercentAttack(0);  // ✅ Сброс прогресса
  };
  const [remainingTimeAttack, setRemainingTimeAttack] = React.useState(0);
  const [remainingTimeBg, setRemainingTimeBg] = React.useState(0);
  const [remainingTimeMod, setRemainingTimeMod] = React.useState(0);
  // const startAttack = (durationMs) => {
  //   setDeadLineAttack(durationMs);           // 25000ms
  //   setRemainingTimeAttack(durationMs);
  // }
  const conicColors = {
    '0%': '#1677ff',
    '50%': '#722ed1',
    '100%': '#ff4d4f',
  };
  const [percentAttack, setPercentAttack] = useState(0);
  const [percentBg, setPercentBg] = useState(50);
  const [percentMod, setPercentMod] = useState(100);

  const initialRemainingTimeRef = useRef(0);

  // Таймер:
useEffect(() => {
  let interval;
  
  if (remainingTimeAttack > 0) {
    interval = setInterval(() => {
      setRemainingTimeAttack(prev => {
        const newTime = Math.max(0, prev - 50);  // Уменьшаем на 50мс
        
        // ✅ progress = сколько уменьшилось / начальное время
        const initialTime = initialRemainingTimeRef.current;
        const elapsedMs = initialTime - newTime;  // Прошло времени
        const progress = Math.floor((elapsedMs / initialTime) * 100);
        
        console.log(`Начало: ${initialTime/1000}s, Осталось: ${newTime/1000}s, Прогресс: ${progress}%`);
        setPercentAttack(progress);
        
        return newTime;
      });
    }, 50);
  }
  
  return () => interval && clearInterval(interval);
}, [remainingTimeAttack]);

  return (
    <PlayContext.Provider value={{
      stopFilenameAttack, setStopFilenameAttack,
      deadLineAttack, setDeadLineAttack,
      onFinishAttack,
      stopFilenameBg, setStopFilenameBg,
      deadLineBg, setDeadLineBg,
      onFinishBg,
      stopFilenameMod, setStopFilenameMod,
      deadLineMod, setDeadLineMod,
      onFinishMod,
      percentAttack, setPercentAttack,
      percentBg, setPercentBg,
      percentMod, setPercentMod,
      conicColors,
      remainingTimeAttack, setRemainingTimeAttack,
      remainingTimeBg, setRemainingTimeBg,
      remainingTimeMod, setRemainingTimeMod,
      initialRemainingTimeRef,
    }}>
      {children}
    </PlayContext.Provider>
  );
}

export const usePlay = () => useContext(PlayContext);

const OutDashboard = ({ token }) => {
  return (
    <PlayProvider>
      {/* ✅ useAttack() ТОЛЬКО ЗДЕСЬ внутри Provider! */}
      <div>
        <Dashboard token={token} />  {/* Передай props */}
      </div>
    </PlayProvider>
  );
};

const Dashboard = ({ token }) => {
  const { 
    stopFilenameAttack, setStopFilenameAttack, 
    deadLineAttack, setDeadLineAttack, 
    onFinishAttack,
    stopFilenameBg, setStopFilenameBg, 
    deadLineBg, setDeadLineBg, 
    onFinishBg,
    stopFilenameMod, setStopFilenameMod,
    deadLineMod, setDeadLineMod,
    onFinishMod,
    percentAttack, setPercentAttack,
    percentBg, setPercentBg,
    percentMod, setPercentMod,
    conicColors,
    remainingTimeAttack, setRemainingTimeAttack,
    remainingTimeBg, setRemainingTimeBg,
    remainingTimeMod, setRemainingTimeMod,
    initialRemainingTimeRef,
  } = usePlay();
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [header, setHeader] = useState("Нажмите на кнопку!");
  const [activeTable, setActiveTable] = useState(null); // Состояние для активной таблицы
  const [open, setOpen] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleStopAttack = async () => {
    try {
      await axios.post(`http://127.0.0.1:8000/stop`);
      message.success(`Процесс успешно остановлен`);
      setDeadLineAttack(0);
    } catch (error) {
      console.error("Ошибка при остановке:", error);
      message.error(`Ошибка при остановке`);
    }
  };
  const handleStopBg = async () => {
    try {
      await axios.post(`http://127.0.0.1:8000/stop`);
      message.success(`Процесс успешно остановлен`);
      setDeadLineBg(0);
    } catch (error) {
      console.error("Ошибка при остановке:", error);
      message.error(`Ошибка при остановке`);
    }
  };
  const handleStopMod = async () => {
    try {
      await axios.post(`http://127.0.0.1:8000/stop`);
      message.success(`Процесс успешно остановлен`);
      setDeadLineMod(0);
    } catch (error) {
      console.error("Ошибка при остановке:", error);
      message.error(`Ошибка при остановке`);
    }
  };
  const handleUpload = async (dir) => {
    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append("file", file);
    });
    setUploading(true);
    // You can use any AJAX library you like
    fetch(`http://127.0.0.1:8000/${dir}/upload`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setFileList([]);
        message.success(`Файл успешно загружен!`);
      })
      .catch(() => {
        message.error("Загрузка не удалась!");
      })
      .finally(() => {
        setUploading(false);
      });
    console.log(dir)
    setTimeout( async () => {
      await fetchData(dir);
      setOpen(false);
    }, 1000);
  };
  const props = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false;
    },
    fileList,
  };
  const handleUploadModal = () => {
    setOpen(true);
  };
  const handleCancel = async (dir) => {
    setOpen(false);
    await fetchData(dir);
  };

  const fetchData = async (dir) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/${dir}`, {
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
    }
  }, [data, activeTable]); // Обновляем при изменении данных или активной таблицы

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/user`, {
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
  // useEffect(() => {
  //   if (activeTable === 'attack') {
  //     setProps(prevProps => ({ ...prevProps, action: 'http://localhost:8000/attack/upload' }));
  //   } else if (activeTable === 'background') {
  //     setProps(prevProps => ({ ...prevProps, action: 'http://localhost:8000/background/upload' }));
  //   }
  // }, [activeTable]);

  return (
    <>
      <header>Вы под пользователем {user ? user : "Загрузка..."}</header>
      <Divider />
      <Space>
      <p>Сейчас проигрывается из шаблонов {stopFilenameAttack}</p>
        {stopFilenameAttack !== "ничего" && (
          <Button onClick={() => handleStopAttack()}>Остановить</Button>
        )}
        {stopFilenameAttack === "ничего" && <Button disabled>Остановить</Button>}
        <Countdown value={deadLineAttack} onFinish={onFinishAttack} />
      </Space>
      <Flex gap="small" wrap>
      <Progress type="dashboard" percent={percentAttack} strokeColor={conicColors} />
      </Flex>
      <Divider />
      <Space>
      <p>Сейчас проигрывается из фонового трафика {stopFilenameBg}</p>
        {stopFilenameBg !== "ничего" && (
          <Button onClick={() => handleStopBg()}>Остановить</Button>
        )}
        {stopFilenameBg === "ничего" && <Button disabled>Остановить</Button>}
        <Countdown value={deadLineBg} onFinish={onFinishBg} />
      </Space>
      <Flex gap="small" wrap>
      <Progress type="dashboard" percent={percentBg} strokeColor={conicColors} />
      </Flex>
      <Divider />
      <Space>
      <p>Сейчас проигрывается из атак {stopFilenameMod}</p>
        {stopFilenameMod !== "ничего" && (
          <Button onClick={() => handleStopMod()}>Остановить</Button>
        )}
        {stopFilenameMod === "ничего" && <Button disabled>Остановить</Button>}
        <Countdown value={deadLineMod} onFinish={onFinishMod} />
      </Space>
      <Flex gap="small" wrap>
      <Progress type="dashboard" percent={percentMod} strokeColor={conicColors} />
      </Flex>
      <div className="home_container">
        <Button
          color="danger"
          variant="outlined"
          onClick={() => handleButtonClick("modified", "mod", "Ваши атаки")}
        >
          Ваши атаки
        </Button>
        <Button
          color="purple"
          variant="outlined"
          onClick={() => handleButtonClick("attack", "attack", "Шаблоны атак")}
        >
          Шаблоны атак
        </Button>
        <Button
          color="primary"
          variant="outlined"
          onClick={() =>
            handleButtonClick("background", "background", "Фоновый трафик")
          }
        >
          Фоновый трафик
        </Button>
      </div>
      <p style={{ textAlign: "center" }}>{header}</p>
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
            <Divider />
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
            onClick={() => handleUpload(activeTable)}
            disabled={fileList.length === 0}
            loading={uploading}
          >
            {uploading ? "Загрузка" : "Начать загрузку"}
          </Button>
        }
      >
        <div>
          <Dragger {...props}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Нажмите или перетащите в эту область файл для загрузки
            </p>
            <p className="ant-upload-hint">
              Поддерживает загрузку по одному файлу. Строго запрещено 
              загружать файлы в формате, отличном от .pcapng
            </p>
          </Dragger>
        </div>
      </Modal>
    </>
  );
};

export default OutDashboard;
