import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import axios from "axios";
import { Button, Divider, Modal, Space, Upload, message, Statistic, Progress, Flex, Tag } from "antd";
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
  const [stopFilenameAttack, setStopFilenameAttack] = useState("ничего");
  const [deadLineAttack, setDeadLineAttack] = useState(0);
  const onFinishAttack = () => {
    setDeadLineAttack(0);
    setRemainingTimeAttack(0);
    setStopFilenameAttack("ничего");
    setPercentAttack(0);  // ✅ Сброс прогресса
  };
  const [stopFilenameBg, setStopFilenameBg] = useState("ничего");
  const [deadLineBg, setDeadLineBg] = useState(0);
  const onFinishBg = () => {
    setDeadLineBg(0);
    setRemainingTimeBg(0);
    setStopFilenameBg("ничего");
    setPercentBg(0);  // ✅ Сброс прогресса
  };
  const [stopFilenameMod, setStopFilenameMod] = useState("ничего");
  const [deadLineMod, setDeadLineMod] = useState(0);
  const onFinishMod = () => {
    setDeadLineMod(0);
    setRemainingTimeMod(0);
    setStopFilenameMod("ничего");
    setPercentMod(0);  // ✅ Сброс прогресса
  };
  const [remainingTimeAttack, setRemainingTimeAttack] = useState(0);
  const [remainingTimeBg, setRemainingTimeBg] = useState(0);
  const [remainingTimeMod, setRemainingTimeMod] = useState(0);
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
  const [percentBg, setPercentBg] = useState(0);
  const [percentMod, setPercentMod] = useState(0);

  const initialRemainingTimeRefAttack = useRef(0);
  const initialRemainingTimeRefBg = useRef(0);
  const initialRemainingTimeRefMod = useRef(0);

  // Таймер:
// useEffect(() => {
//   let interval;
  
//   if (remainingTimeAttack > 0) {
//     interval = setInterval(() => {
//       setRemainingTimeAttack(prev => {
//         const newTime = Math.max(0, prev - 50);  // Уменьшаем на 50мс
        
//         // ✅ progress = сколько уменьшилось / начальное время
//         const initialTime = initialRemainingTimeRef.current;
//         const elapsedMs = initialTime - newTime;  // Прошло времени
//         const progress = Math.floor((elapsedMs / initialTime) * 100);
        
//         console.log(`Начало: ${initialTime/1000}s, Осталось: ${newTime/1000}s, Прогресс: ${progress}%`);
//         setPercentAttack(progress);
        
//         return newTime;
//       });
//     }, 50);
//   }
  
//   return () => interval && clearInterval(interval);
// }, [remainingTimeAttack]);

const [activeAttacks, setActiveAttacks] = useState([]);  // ✅ Массив атак!
const [activeBgs, setActiveBgs] = useState([]);  // ✅ Массив атак!
const [activeMods, setActiveMods] = useState([]);  // ✅ Массив атак!
  
// ✅ Добавляем новую атаку
const startAttack = (filename, durationSeconds, attackId, pid) => {
  const deadLine = Date.now() + durationSeconds * 1000;
  const initialDuration = durationSeconds * 1000;
  
  const newAttack = {
    id: attackId,
    filename,
    pid,
    deadLine,
    initialDuration,
    percent: 0,
    status: 'running'  // running | completed
  };
  
  console.log('🚀 Запуск атаки:', newAttack);
  setActiveAttacks(prev => [...prev, newAttack]);
};
// ✅ Добавляем новую атаку
const startBg = (filename, durationSeconds, attackId, pid) => {
  const deadLine = Date.now() + durationSeconds * 1000;
  const initialDuration = durationSeconds * 1000;
  
  const newAttack = {
    id: attackId,
    filename,
    pid,
    deadLine,
    initialDuration,
    percent: 0,
    status: 'running'  // running | completed
  };
  
  console.log('🚀 Запуск атаки:', newAttack);
  setActiveBgs(prev => [...prev, newAttack]);
};
// ✅ Добавляем новую атаку
const startMod = (filename, durationSeconds, attackId, pid) => {
  const deadLine = Date.now() + durationSeconds * 1000;
  const initialDuration = durationSeconds * 1000;
  
  const newAttack = {
    id: attackId,
    filename,
    pid,
    deadLine,
    initialDuration,
    percent: 0,
    status: 'running'  // running | completed
  };
  
  console.log('🚀 Запуск атаки:', newAttack);
  setActiveMods(prev => [...prev, newAttack]);
};

// ✅ Синхронизируем прогресс ВСЕХ атак
useEffect(() => {
  const interval = setInterval(() => {
    setActiveAttacks(prevAttacks => 
      prevAttacks.map(attack => {
        if (attack.status === 'completed' || attack.status === 'stopped') {
          return {
            ...attack,
            percent: attack.percent,  // ✅ Замораживаем %!
            deadLine: attack.deadLine || Date.now()  // ✅ Сбрасываем таймер
          };
        }  // ✅ Не трогаем завершённые!
        // const now = Date.now();
        // const elapsed = now - (attack.deadLine - attack.initialDuration);
        // const progress = Math.min(Math.floor((elapsed / attack.initialDuration) * 100), 100);
        const startTime = attack.deadLine - attack.initialDuration;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(Math.floor((elapsed / attack.initialDuration) * 100), 100);
        
        // ✅ Помечаем завершённые
        if (progress >= 100) {
          return {
            ...attack,
            percent: 100,
            status: 'completed'
          };
        }
        
        return { ...attack, percent: progress };
      })  // Удаляем завершённые
    );
  }, 100);
  
  return () => clearInterval(interval);
}, []);
// ✅ Синхронизируем прогресс ВСЕХ атак
useEffect(() => {
  const interval = setInterval(() => {
    setActiveBgs(prevAttacks => 
      prevAttacks.map(attack => {
        if (attack.status === 'completed' || attack.status === 'stopped') {
          return {
            ...attack,
            percent: attack.percent,  // ✅ Замораживаем %!
            deadLine: attack.deadLine || Date.now()  // ✅ Сбрасываем таймер
          };
        }  // ✅ Не трогаем завершённые!
        // const now = Date.now();
        // const elapsed = now - (attack.deadLine - attack.initialDuration);
        // const progress = Math.min(Math.floor((elapsed / attack.initialDuration) * 100), 100);
        const startTime = attack.deadLine - attack.initialDuration;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(Math.floor((elapsed / attack.initialDuration) * 100), 100);
        
        // ✅ Помечаем завершённые
        if (progress >= 100) {
          return {
            ...attack,
            percent: 100,
            status: 'completed'
          };
        }
        
        return { ...attack, percent: progress };
      })  // Удаляем завершённые
    );
  }, 100);
  
  return () => clearInterval(interval);
}, []);
// ✅ Синхронизируем прогресс ВСЕХ атак
useEffect(() => {
  const interval = setInterval(() => {
    setActiveMods(prevAttacks => 
      prevAttacks.map(attack => {
        if (attack.status === 'completed' || attack.status === 'stopped') {
          return {
            ...attack,
            percent: attack.percent,  // ✅ Замораживаем %!
            deadLine: attack.deadLine || Date.now()  // ✅ Сбрасываем таймер
          };
        }  // ✅ Не трогаем завершённые!
        // const now = Date.now();
        // const elapsed = now - (attack.deadLine - attack.initialDuration);
        // const progress = Math.min(Math.floor((elapsed / attack.initialDuration) * 100), 100);
        const startTime = attack.deadLine - attack.initialDuration;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(Math.floor((elapsed / attack.initialDuration) * 100), 100);
        
        // ✅ Помечаем завершённые
        if (progress >= 100) {
          return {
            ...attack,
            percent: 100,
            status: 'completed'
          };
        }
        
        return { ...attack, percent: progress };
      })  // Удаляем завершённые
    );
  }, 100);
  
  return () => clearInterval(interval);
}, []);

const stopAttack = async (attackId) => {
  const attack = activeAttacks.find(a => a.id === attackId);
  try {
    // 2️⃣ Frontend: меняем статус
    setActiveAttacks(prev => {
      const updated = prev.map(a => 
        a.id === attackId 
          ? { ...a, status: 'stopped', percent: a.percent }
          : a
      );
      return updated;
    });

    /// 3️⃣ Backend: только attackId!
    console.log(`🛑 Останавливаю шаблон ${attackId}`);
    await axios.post(`http://127.0.0.1:8000/stop/${attackId}`);
    message.success(`🛑 "${attack?.filename || 'шаблон'}" остановлен`);  // ✅ Безопасно!
    
  } catch (error) {
    console.error("Ошибка при остановке:", error);
    message.error(`Ошибка при остановке`);
    // ✅ Откатываем статус если backend упал
    // setActiveAttacks(prev => {
    //   const updated = prev.map(attack => 
    //     attack.id === attackId 
    //       ? { ...attack, status: 'running' }
    //       : attack
    //   );
    //   return updated;
    // });
  }
};
const stopBg = async (attackId) => {
  const attack = activeBgs.find(a => a.id === attackId);
  try {
    // 2️⃣ Frontend: меняем статус
    setActiveBgs(prev => {
      const updated = prev.map(a => 
        a.id === attackId 
          ? { ...a, status: 'stopped', percent: a.percent }
          : a
      );
      return updated;
    });
    /// 3️⃣ Backend: только attackId!
    console.log(`🛑 Останавливаю фоновый ${attackId}`);
    await axios.post(`http://127.0.0.1:8000/stop/${attackId}`);
    message.success(`🛑 "${attack?.filename || 'фоновый трафик'}" остановлен`);  // ✅ Безопасно!
    
  } catch (error) {
    console.error("Ошибка при остановке:", error);
    message.error(`Ошибка при остановке`);
    // ✅ Откатываем статус если backend упал
    // setActiveAttacks(prev => {
    //   const updated = prev.map(attack => 
    //     attack.id === attackId 
    //       ? { ...attack, status: 'running' }
    //       : attack
    //   );
    //   return updated;
    // });
  }
};
const stopMod = async (attackId) => {
  const attack = activeMods.find(a => a.id === attackId);
  try {
    // 2️⃣ Frontend: меняем статус
    setActiveMods(prev => {
      const updated = prev.map(a => 
        a.id === attackId 
          ? { ...a, status: 'stopped', percent: a.percent }
          : a
      );
      return updated;
    });
    /// 3️⃣ Backend: только attackId!
    console.log(`🛑 Останавливаю атаку ${attackId}`);
    await axios.post(`http://127.0.0.1:8000/stop/${attackId}`);
    message.success(`🛑 "${attack?.filename || 'атака'}" остановлена`);  // ✅ Безопасно!
    
  } catch (error) {
    console.error("Ошибка при остановке:", error);
    message.error(`Ошибка при остановке`);
    // ✅ Откатываем статус если backend упал
    // setActiveAttacks(prev => {
    //   const updated = prev.map(attack => 
    //     attack.id === attackId 
    //       ? { ...attack, status: 'running' }
    //       : attack
    //   );
    //   return updated;
    // });
  }
};

const clearCompletedAttack = () => {
  setActiveAttacks(prev => prev.filter(attack => attack.status !== 'completed'));
};
const clearCompletedBg = () => {
  setActiveBgs(prev => prev.filter(attack => attack.status !== 'completed'));
};
const clearCompletedMod = () => {
  setActiveMods(prev => prev.filter(attack => attack.status !== 'completed'));
};

const clearStoppedAttack = () => {
  setActiveAttacks(prev => prev.filter(attack => attack.status !== 'stopped'));
};
const clearStoppedBg = () => {
  setActiveBgs(prev => prev.filter(attack => attack.status !== 'stopped'));
};
const clearStoppedMod = () => {
  setActiveMods(prev => prev.filter(attack => attack.status !== 'stopped'));
};

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
      initialRemainingTimeRefAttack,
      initialRemainingTimeRefBg,
      initialRemainingTimeRefMod,
      activeAttacks,
      startAttack,
      stopAttack,
      clearCompletedAttack, clearStoppedAttack,
      activeBgs,
      startBg,
      stopBg,
      clearCompletedBg, clearStoppedBg,
      activeMods,
      startMod,
      stopMod,
      clearCompletedMod, clearStoppedMod,
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
    initialRemainingTimeRefAttack,
    initialRemainingTimeRefBg,
    initialRemainingTimeRefMod,
    activeAttacks,
    startAttack,
    stopAttack,
    clearCompletedAttack, clearStoppedAttack,
    activeBgs,
    startBg,
    stopBg,
    clearCompletedBg, clearStoppedBg,
    activeMods,
    startMod,
    stopMod,
    clearCompletedMod, clearStoppedMod,
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
      setPercentAttack(0);
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
      <p style={{ textAlign: "center" }}>Запущенные шаблоны атак</p>
      {activeAttacks.length > 0 ? (
        <Flex gap="small" wrap>
        {/* <div className="active-attacks">
        {activeAttacks.map(attack => (
          <div key={attack.id} className="attack-progress">
            <Space>
              <p>🎮 {attack.filename}</p>
              <Button onClick={() => stopAttack(attack.id)}>🛑 Остановить</Button>
              <Countdown value={attack.deadLine} onFinish={() => stopAttack(attack.id)} />
            </Space>
            
            <Progress 
              type="dashboard" 
              percent={attack.percent} 
              strokeColor={conicColors}
            />
          </div>
        ))}
        </div> */}
        {activeAttacks.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>🎮 Активные атаки ({activeAttacks.length})</h3>
          <div className="attacks-container">
            {activeAttacks.map(attack => (
              <div key={attack.id} className={`attack-card ${attack.status}`}>
                <div className="attack-header">
                  <span>📁 {attack.filename}</span>
                  {attack.status === 'running' ? (
                    <Button 
                      danger 
                      size="small" 
                      onClick={() => stopAttack(attack.id)}
                    >
                      🛑 Остановить
                    </Button>
                  ) : attack.status === 'stopped' ? (
                      <Tag color="error">🛑 Остановлена</Tag>
                  ) : (
                    <Tag color="success">✅ Завершено</Tag>
                  )}
                </div>
                
                <div className="attack-progress">
                  <Progress 
                    type="dashboard" 
                    percent={attack.percent}
                    strokeColor={conicColors}
                  />
                </div>
                
                {attack.status === 'running' && (
                  <Countdown 
                    value={attack.deadLine} 
                    // onFinish={() => {}} 
                    format="HH:mm:ss"
                  />
                )}
                {/* ✅ Для stopped показываем "00:00:00" */}
                {attack.status === 'stopped' && (
                  <div className="countdown-timer" style={{color: '#ff4d4f'}}>
                    00:00:00 🛑
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* ✅ Кнопка очистки */}
          {activeAttacks.some(a => a.status === 'completed') && (
            <Button 
              onClick={clearCompletedAttack} 
              type="dashed"
              style={{ marginTop: '10px' }}
            >
              🗑️ Очистить завершённые (
              {activeAttacks.filter(a => a.status === 'completed').length}
              )
            </Button>
          )}
          {/* ✅ Показываем кнопку ТОЛЬКО если есть остановленные */}
          {activeAttacks.some(a => a.status === 'stopped') && (
            <Button 
              danger 
              type="dashed"
              onClick={clearStoppedAttack}
              style={{ marginRight: '8px' }}
            >
              🗑️ Очистить остановленные (
              {activeAttacks.filter(a => a.status === 'stopped').length}
              )
            </Button>
        )}
        </div>)}
        </Flex>
      ) : (
        <div className="centered">
          <Space
            direction="vertical"
            size="middle"
            style={{
              display: "flex",
            }}
          >
            <div className="centered">
              <p>У вас пока нет запущенных шаблонов атак.</p>
              <p>Хотите запустить шаблон атаки?</p>
            </div>
            <div className="centered">
              <Button
                color="purple"
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
      )}
      <Divider />
      <p style={{ textAlign: "center" }}>Запущенный фоновый трафик</p>
      {activeBgs.length > 0 ? (
        <Flex gap="small" wrap>
        {/* <div className="active-attacks">
        {activeAttacks.map(attack => (
          <div key={attack.id} className="attack-progress">
            <Space>
              <p>🎮 {attack.filename}</p>
              <Button onClick={() => stopAttack(attack.id)}>🛑 Остановить</Button>
              <Countdown value={attack.deadLine} onFinish={() => stopAttack(attack.id)} />
            </Space>
            
            <Progress 
              type="dashboard" 
              percent={attack.percent} 
              strokeColor={conicColors}
            />
          </div>
        ))}
        </div> */}
        {activeBgs.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>🎮 Активные атаки ({activeBgs.length})</h3>
          <div className="attacks-container">
            {activeBgs.map(attack => (
              <div key={attack.id} className={`attack-card ${attack.status}`}>
                <div className="attack-header">
                  <span>📁 {attack.filename}</span>
                  {attack.status === 'running' ? (
                    <Button 
                      danger 
                      size="small" 
                      onClick={() => stopBg(attack.id)}
                    >
                      🛑 Остановить
                    </Button>
                  ) : attack.status === 'stopped' ? (
                      <Tag color="error">⏸️ Приостановлена нет</Tag>
                  ) : (
                    <Tag color="success">✅ Завершено</Tag>
                  )}
                </div>
                
                <div className="attack-progress">
                  <Progress 
                    type="dashboard" 
                    percent={attack.percent}
                    strokeColor={conicColors}
                  />
                </div>
                
                {attack.status === 'running' && (
                  <Countdown 
                    value={attack.deadLine} 
                    // onFinish={() => {}} 
                    format="HH:mm:ss"
                  />
                )}
                {/* ✅ Для stopped показываем "00:00:00" */}
                {attack.status === 'stopped' && (
                  <div className="countdown-timer" style={{color: '#ff4d4f'}}>
                    00:00:00 🛑
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* ✅ Кнопка очистки */}
          {activeBgs.some(a => a.status === 'completed') && (
            <Button 
              onClick={clearCompletedBg} 
              type="dashed"
              style={{ marginTop: '10px' }}
            >
              🗑️ Очистить завершённые (
              {activeBgs.filter(a => a.status === 'completed').length}
              )
            </Button>
          )}
          {/* ✅ Показываем кнопку ТОЛЬКО если есть остановленные */}
          {activeBgs.some(a => a.status === 'stopped') && (
            <Button 
              danger 
              type="dashed"
              onClick={clearStoppedBg}
              style={{ marginRight: '8px' }}
            >
              🗑️ Очистить остановленные (
              {activeBgs.filter(a => a.status === 'stopped').length}
              )
            </Button>
        )}
        </div>)}
        </Flex>
      ) : (
        <div className="centered">
          <Space
            direction="vertical"
            size="middle"
            style={{
              display: "flex",
            }}
          >
            <div className="centered">
              <p>У вас пока нет запущенного фонового трафика.</p>
              <p>Хотите запустить фоновый трафик?</p>
            </div>
            <div className="centered">
              <Button
                color="primary"
                variant="solid"
                onClick={() =>
                  handleButtonClick("background", "background", "Фоновый трафик")
                }
              >
                Да!
              </Button>
            </div>
          </Space>
        </div>
      )}
      <Divider />
      <Space>
      <p>Сейчас проигрывается из атак {stopFilenameMod}</p>
        {stopFilenameMod !== "ничего" && (
          <Button onClick={() => handleStopMod()}>Остановить</Button>
        )}
        {stopFilenameMod === "ничего" && <Button disabled>Остановить</Button>}
        <Countdown 
          value={deadLineMod} 
          onFinish={onFinishMod}
          onChange={(value) => {
            // ✅ Countdown сам вычисляет оставшееся время!
            const remainingMs = value;  // Миллисекунды от Countdown
            setRemainingTimeMod(remainingMs);
            
            // Прогресс от реального оставшегося времени
            const totalDuration = initialRemainingTimeRefMod.current;  // 25000ms
            const progress = Math.floor(((totalDuration - remainingMs) / totalDuration) * 100);
            setPercentMod(progress);
          }}
        />
      </Space>
      <Flex gap="small" wrap>
      {activeMods.length > 0 && (
      <div style={{ marginTop: '20px' }}>
        <h3>🎮 Активные атаки ({activeMods.length})</h3>
        
        <div className="attacks-container">
          {activeMods.map(attack => (
            <div key={attack.id} className={`attack-card ${attack.status}`}>
              <div className="attack-header">
                <span>📁 {attack.filename}</span>
                {attack.status === 'running' ? (
                  <Button 
                    danger 
                    size="small" 
                    onClick={() => stopMod(attack.id)}
                  >
                    🛑 Остановить
                  </Button>
                ) : attack.status === 'stopped' ? (
                    <Tag color="default">⏸️ Приостановлена нет</Tag>
                ) : (
                  <Tag color="success">✅ Завершено</Tag>
                )}
              </div>
              
              <div className="attack-progress">
                <Progress 
                  type="dashboard" 
                  percent={attack.percent}
                  strokeColor={conicColors}
                />
              </div>
              
              {attack.status === 'running' && (
                <Countdown 
                  value={attack.deadLine} 
                  onFinish={() => {}} 
                  format="HH:mm:ss"
                />
              )}
            </div>
          ))}
        </div>
        
        {/* ✅ Кнопка очистки */}
        {activeMods.some(a => a.status === 'completed') && (
          <Button 
            onClick={clearCompletedMod} 
            type="dashed"
            style={{ marginTop: '10px' }}
          >
            🗑️ Очистить завершённые (
            {activeMods.filter(a => a.status === 'completed').length}
            )
          </Button>
        )}
      </div>
      )}
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
