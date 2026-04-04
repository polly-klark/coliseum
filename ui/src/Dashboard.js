import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import axios from "axios";
import { Button, Divider, Modal, Space, Upload, message, Statistic, Progress, Flex, Tag, InputNumber, Alert, Select, } from "antd";
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
  const [selectedMode, setSelectedMode] = React.useState('standart');
  const [loopCount, setLoopCount] = React.useState(5);
  const [multiplier, setMultiplier] = React.useState(2.0);
  const [ppsValue, setPpsValue] = React.useState(200);
  const [openPlay, setOpenPlay] = React.useState(false);
  const [selectedFilename, setSelectedFilename] = React.useState("");
  const options = [
    { label: 'Обычный', value: 'standart' },
    { label: 'Зациклить', value: 'loop' },
    { label: 'Максимальная скорость', value: 'topspeed' },
    { label: 'Умножить скорость', value: 'mltiplier' },
    { label: 'Скорость вручную', value: 'pps' },
  ];
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

// В renderModeOptions:
const renderModeOptions = () => {
  switch (selectedMode) {
    case 'standart':
      return <div>Обычный режим — без дополнительных настроек</div>;
    case 'loop':
      return (
        <div>
          <p>Количество повторений:</p>
          <InputNumber 
            min={1} max={100} 
            value={loopCount} 
            onChange={setLoopCount}
          />
        </div>
      );
    case 'topspeed':
      return <div>Максимальная скорость — игнорируются задержки</div>;
    case 'mltiplier':
      return (
        <div>
          <p>Множитель скорости:</p>
          <Flex gap="middle" vertical>
            <InputNumber 
              min={0.1} max={10} step={0.1} 
              value={multiplier} 
              onChange={setMultiplier}
            />
            <Alert 
              type="info" 
              showIcon 
              message="Примечание:"
              description="2.0 — в 2 раза быстрее, 0.5 — в 2 раза медленнее"
            />
          </Flex>
        </div>
      );
    case 'pps':
      return (
        <div>
          <p>Пакетов в секунду:</p>
          <InputNumber 
            min={1} max={10000} 
            value={ppsValue} 
            onChange={setPpsValue}
          />
        </div>
      );
    default:
      return null;
  }
};

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
// const startAttack = (filename, durationSeconds, attackId, pid) => {
//   const deadLine = Date.now() + durationSeconds * 1000;
//   const initialDuration = durationSeconds * 1000;
  
//   const newAttack = {
//     id: attackId,
//     filename,
//     pid,
//     deadLine,
//     initialDuration,
//     percent: 0,
//     status: 'running'  // running | completed
//   };
  
//   console.log('🚀 Запуск атаки:', newAttack);
//   setActiveAttacks(prev => [...prev, newAttack]);
// };
const startAttack = (filename, durationSeconds, attackId, pid, mode, modeParams) => {
  const effectiveDuration = durationSeconds / (modeParams.multiplier || 1);
  
  const newAttack = {
    id: attackId,
    filename,
    pid,
    status: 'running',
    durationTotal: durationSeconds,        // базовая длительность
    elapsed: 0,
    lastTickAt: Date.now(),
    effectiveDuration,                     // скорректированная
    mode,
    modeParams,
    loopCurrent: 0,
    loopTotal: modeParams.loop_count || 1,
    percent: 0,
  };

  setActiveAttacks(prev => [...prev, newAttack]);
};



// ✅ Добавляем новую атаку
const startBg = (filename, durationSeconds, attackId, pid, mode, modeParams) => {
  const effectiveDuration = durationSeconds / (modeParams.multiplier || 1);
  
  const newAttack = {
    id: attackId,
    filename,
    pid,
    status: 'running',
    durationTotal: durationSeconds,        // базовая длительность
    elapsed: 0,
    lastTickAt: Date.now(),
    effectiveDuration,                     // скорректированная
    mode,
    modeParams,
    loopCurrent: 0,
    loopTotal: modeParams.loop_count || 1,
    percent: 0,
  };

  setActiveBgs(prev => [...prev, newAttack]);
};
// ✅ Добавляем новую атаку
const startMod = (filename, durationSeconds, attackId, pid, mode, modeParams) => {
  const effectiveDuration = durationSeconds / (modeParams.multiplier || 1);
  
  const newAttack = {
    id: attackId,
    filename,
    pid,
    status: 'running',
    durationTotal: durationSeconds,        // базовая длительность
    elapsed: 0,
    lastTickAt: Date.now(),
    effectiveDuration,                     // скорректированная
    mode,
    modeParams,
    loopCurrent: 0,
    loopTotal: modeParams.loop_count || 1,
    percent: 0,
  };

  setActiveMods(prev => [...prev, newAttack]);
};

// ✅ Синхронизируем прогресс ВСЕХ атак
useEffect(() => {
  const interval = setInterval(() => {
    setActiveAttacks(prev =>
      prev.map(a => {

        if (a.status === 'stopped') {
          return { ...a };  // НЕ крутим Progress!
        }
        if (a.lastTickAt == null) return a;

        const now = Date.now();
        const deltaSec = (now - a.lastTickAt) / 1000;
        let elapsed = a.elapsed + deltaSec;
        
        const effectiveDuration = a.durationTotal / (a.modeParams?.multiplier || 1);
        let status = a.status;
        let loopCurrent = a.loopCurrent;

        if (elapsed >= effectiveDuration) {
          elapsed = 0;
          loopCurrent += 1;
          
          if (loopCurrent >= a.loopTotal) {
            status = 'completed';
            elapsed = effectiveDuration; // ✅ 100% в конце
          }
        }

        // ✅ ВСЕГДА считаем percent
        const percent = Math.min(100, Math.floor((elapsed / effectiveDuration) * 100));

        // ✅ Обновляем ВСЕГДА
        return {
          ...a,
          elapsed,
          status,
          lastTickAt: now,
          loopCurrent,
          effectiveDuration,
          percent,
        };
      })
    );
  }, 100);

  return () => clearInterval(interval);
}, []);





// ✅ Синхронизируем прогресс ВСЕХ атак
useEffect(() => {
  const interval = setInterval(() => {
    setActiveBgs(prev =>
      prev.map(a => {

        if (a.status === 'stopped') {
          return { ...a };  // НЕ крутим Progress!
        }
        
        if (a.lastTickAt == null) return a;

        const now = Date.now();
        const deltaSec = (now - a.lastTickAt) / 1000;
        let elapsed = a.elapsed + deltaSec;
        
        const effectiveDuration = a.durationTotal / (a.modeParams?.multiplier || 1);
        let status = a.status;
        let loopCurrent = a.loopCurrent;

        if (elapsed >= effectiveDuration) {
          elapsed = 0;
          loopCurrent += 1;
          
          if (loopCurrent >= a.loopTotal) {
            status = 'completed';
            elapsed = effectiveDuration; // ✅ 100% в конце
          }
        }

        // ✅ ВСЕГДА считаем percent
        const percent = Math.min(100, Math.floor((elapsed / effectiveDuration) * 100));

        // ✅ Обновляем ВСЕГДА
        return {
          ...a,
          elapsed,
          status,
          lastTickAt: now,
          loopCurrent,
          effectiveDuration,
          percent,
        };
      })
    );
  }, 100);

  return () => clearInterval(interval);
}, []);
// ✅ Синхронизируем прогресс ВСЕХ атак
useEffect(() => {
  const interval = setInterval(() => {
    setActiveMods(prev =>
      prev.map(a => {

        if (a.status === 'stopped') {
          return { ...a };  // НЕ крутим Progress!
        }
        
        if (a.lastTickAt == null) return a;

        const now = Date.now();
        const deltaSec = (now - a.lastTickAt) / 1000;
        let elapsed = a.elapsed + deltaSec;
        
        const effectiveDuration = a.durationTotal / (a.modeParams?.multiplier || 1);
        let status = a.status;
        let loopCurrent = a.loopCurrent;

        if (elapsed >= effectiveDuration) {
          elapsed = 0;
          loopCurrent += 1;
          
          if (loopCurrent >= a.loopTotal) {
            status = 'completed';
            elapsed = effectiveDuration; // ✅ 100% в конце
          }
        }

        // ✅ ВСЕГДА считаем percent
        const percent = Math.min(100, Math.floor((elapsed / effectiveDuration) * 100));

        // ✅ Обновляем ВСЕГДА
        return {
          ...a,
          elapsed,
          status,
          lastTickAt: now,
          loopCurrent,
          effectiveDuration,
          percent,
        };
      })
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

const pauseAttack = async (attackId) => {
  try {
    await axios.post(`http://127.0.0.1:8000/pause/${attackId}`);
    setActiveAttacks(prev =>
      prev.map(a => {
        if (a.id !== attackId) return a;
        return {
          ...a,
          status: 'paused',
          lastTickAt: null, // ключевое: перестаём считать дельту
        };
      })
    );
    message.success('⏸️ Атака приостановлена');
  } catch (error) {
    message.error('Ошибка паузы');
  }
};

const resumeAttack = async (attackId) => {
  try {
    await axios.post(`http://127.0.0.1:8000/resume/${attackId}`);
    setActiveAttacks(prev =>
      prev.map(a => {
        if (a.id !== attackId) return a;
        return {
          ...a,
          status: 'running',
          lastTickAt: Date.now(), // продолжаем с текущего elapsed
        };
      })
    );
    message.success('▶️ Атака возобновлена');
  } catch (error) {
    message.error('Ошибка возобновления');
  }
};

const pauseBg = async (attackId) => {
  try {
    await axios.post(`http://127.0.0.1:8000/pause/${attackId}`);
    setActiveBgs(prev =>
      prev.map(a => {
        if (a.id !== attackId) return a;
        return {
          ...a,
          status: 'paused',
          lastTickAt: null, // ключевое: перестаём считать дельту
        };
      })
    );
    message.success('⏸️ Атака приостановлена');
  } catch (error) {
    message.error('Ошибка паузы');
  }
};

const resumeBg = async (attackId) => {
  try {
    await axios.post(`http://127.0.0.1:8000/resume/${attackId}`);
    setActiveBgs(prev =>
      prev.map(a => {
        if (a.id !== attackId) return a;
        return {
          ...a,
          status: 'running',
          lastTickAt: Date.now(), // продолжаем с текущего elapsed
        };
      })
    );
    message.success('▶️ Атака возобновлена');
  } catch (error) {
    message.error('Ошибка возобновления');
  }
};

const pauseMod = async (attackId) => {
  try {
    await axios.post(`http://127.0.0.1:8000/pause/${attackId}`);
    setActiveMods(prev =>
      prev.map(a => {
        if (a.id !== attackId) return a;
        return {
          ...a,
          status: 'paused',
          lastTickAt: null, // ключевое: перестаём считать дельту
        };
      })
    );
    message.success('⏸️ Атака приостановлена');
  } catch (error) {
    message.error('Ошибка паузы');
  }
};

const resumeMod = async (attackId) => {
  try {
    await axios.post(`http://127.0.0.1:8000/resume/${attackId}`);
    setActiveMods(prev =>
      prev.map(a => {
        if (a.id !== attackId) return a;
        return {
          ...a,
          status: 'running',
          lastTickAt: Date.now(), // продолжаем с текущего elapsed
        };
      })
    );
    message.success('▶️ Атака возобновлена');
  } catch (error) {
    message.error('Ошибка возобновления');
  }
};

const getAttackStatus = async (attackId) => {
  const resp = await axios.get(`http://127.0.0.1:8000/status/${attackId}`);
  return resp.data;
};

const handlePlayModal = async (filename, event) => {
  event.preventDefault();
  setOpenPlay(true);
  setSelectedFilename(filename);
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
      pauseAttack, resumeAttack, getAttackStatus,
      pauseBg, resumeBg,
      pauseMod, resumeMod,
      selectedMode, setSelectedMode,
      loopCount, setLoopCount,
      multiplier, setMultiplier,
      ppsValue, setPpsValue,
      renderModeOptions,
      openPlay, setOpenPlay,
      selectedFilename, setSelectedFilename,
      options, handlePlayModal,
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
    pauseAttack, resumeAttack, getAttackStatus,
    pauseBg, resumeBg,
    pauseMod, resumeMod,
  } = usePlay();
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [header, setHeader] = useState("Нажмите на кнопку!");
  const [activeTable, setActiveTable] = useState(null); // Состояние для активной таблицы
  const [openUpload, setOpenUpload] = useState(false);
  const [openPlay, setOpenPlay] = useState(false);
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
    
    fileList.forEach((fileObj) => {
      // ✅ КРИТИЧНО: originFileObj содержит настоящий File!
      const file = fileObj.originFileObj || fileObj;
      formData.append("files", file);
    });
    
    setUploading(true);
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/${dir}/upload`, {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      setFileList([]);
      message.success(`Загружено: ${result.files?.length || 0} файлов`);
      
    } catch (error) {
      message.error("Ошибка загрузки!");
    } finally {
      setUploading(false);
      setTimeout(async () => {
        await fetchData(dir);
        setOpenUpload(false);
      }, 1000);
    }
  };
  const props = {
    name: 'files',
    multiple: true,
    maxCount: 10,  // ✅ БЛОКИРУЕТ выбор >10!
    accept: ".pcap,.pcapng",  // ← В диалоге только PCAP!
    fileList,
    onChange: ({ fileList: newList }) => {
      // ✅ Фильтруем только PCAP
      const validList = newList.filter(file => 
        /\.(pcap|pcapng)$/i.test(file.name) 
      );
      
      setFileList(validList);
      
      if (newList.length !== validList.length) {
        message.warning(`Отклонено: ${newList.length - validList.length} файлов`);
      }
    },
    onRemove: file => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid));
    },
    beforeUpload: () => false,  // ✅ ЖЁСТКО блокируем!
  };
  const handleUploadModal = () => {
    setOpenUpload(true);
  };
  const handlePlayModal = () => {
    setOpenPlay(true);
  };
  const handleCancelUpload = async (dir) => {
    setOpenUpload(false);
    await fetchData(dir);
  };
  const handleCancelPlay = async (dir) => {
    setOpenPlay(false);
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

  // В компоненте с атаками
  const [stopLoopTargets, setStopLoopTargets] = useState({});  // {attackId: targetLoop}

  const setStopAtLoop = (attackId, value) => {
    setStopLoopTargets(prev => ({
      ...prev,
      [attackId]: parseInt(value)
    }));
  };

  const stopAtLoop = async (attackId, stopLoopValue) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/attack/stop_at_loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attack_id: attackId, 
          target_loop: stopLoopValue 
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        message.error(result.error);
      } else {
        message.success(result.message);
        // // Обновить статус атаки
        // await updateAttackStatus(attackId);
      }
    } catch (error) {
      message.error('Ошибка остановки атаки');
      console.error(error);
    }
  };
  return (
    <>
      <header>Вы под пользователем {user ? user : "Загрузка..."}</header>
      <Divider />
      <p style={{ 
        textAlign: "center",
        fontSize: "28px",           // ✅ БОЛЬШОЙ размер
        color: "#ff4d4f",           // ✅ КРАСНЫЙ цвет
        fontWeight: "bold",         // ✅ ЖИРНЫЙ
        fontFamily: "Arial Black, sans-serif",  // ✅ Крутой шрифт
        textShadow: "2px 2px 4px rgba(0,0,0,0.3)",  // ✅ Тень для объёма
        margin: "20px 0",
        letterSpacing: "1px"        // ✅ Расстояние между буквами
      }}>
      Запущенные атаки
      </p>
      {activeMods.length > 0 ? (
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
        {activeMods.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>🎮 Активные атаки ({activeMods.length})</h3>
          <div className="attacks-container">
            {activeMods.map(attack => (
              <div key={attack.id} className={`attack-card ${attack.status}`}>
                <div className="attack-header">
                  <span>📁 {attack.filename}</span>
                  {attack.status === 'running' && (
                    <div>
                      {attack.mode !== 'topspeed' && attack.mode !== 'loop' && (
                        <Button size="small" onClick={() => pauseMod(attack.id)}>
                          ⏸️ Пауза
                        </Button>
                      )}
                      {attack.mode !== 'loop' && (
                        <Button danger size="small" onClick={() => stopMod(attack.id)}>
                          🛑 Остановить
                        </Button>
                      )}
                      {/* <Button
                        size="small"
                        onClick={async () => {
                          try {
                            const data = await getAttackStatus(attack.id);
                            console.log("STATUS:", data);
                            // при желании можно показать message:
                            // message.info(`PID ${data.pid}, alive=${data.alive}, status=${data.status}`);
                          } catch (e) {
                            console.error(e);
                            message.error("Не удалось получить статус");
                          }
                        }}
                      >
                        🔍 Статус
                      </Button> */}
                    </div>
                  )}
                  {attack.status === 'paused' && (
                    <div>
                      <Button type="primary" size="small" onClick={() => resumeMod(attack.id)}>
                      ▶️ Продолжить
                    </Button>
                    {/* <Button
                      size="small"
                      onClick={async () => {
                        try {
                          const data = await getAttackStatus(attack.id);
                          console.log("STATUS:", data);
                          // при желании можно показать message:
                          // message.info(`PID ${data.pid}, alive=${data.alive}, status=${data.status}`);
                        } catch (e) {
                          console.error(e);
                          message.error("Не удалось получить статус");
                        }
                      }}
                    >
                      🔍 Статус
                    </Button> */}
                    </div>
                  )}
                  {attack.status === 'stopped' && <Tag color="error">🛑 Остановлена</Tag>}
                  {attack.status === 'completed' && <Tag color="success">✅ Завершено</Tag>}
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
                    value={Date.now() + (attack.effectiveDuration - attack.elapsed) * 1000} 
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
                {attack.status === 'running' && attack.mode === 'loop' && (
                  <Space>
                    <Button 
                      size="small" 
                      onClick={() => pauseMod(attack.id)}  // ✅ Текущий круг!
                    >
                      ⏸️ Пауза сейчас (круг {attack.loopCurrent + 1}/{attack.loopTotal})
                    </Button>
                    <Button danger size="small" onClick={() => stopMod(attack.id)}>
                      🛑 Остановить
                    </Button>
                  </Space>
                )}
              </div>
            ))}
          </div>
          
          {/* ✅ Кнопка очистки */}
          {activeMods.some(a => a.status === 'completed') && (
            <Button 
              onClick={clearCompletedMod} 
              type="dashed"
              className="green-hover-btn"
            >
              🗑️ Очистить завершённые (
              {activeMods.filter(a => a.status === 'completed').length}
              )
            </Button>
          )}
          {/* ✅ Показываем кнопку ТОЛЬКО если есть остановленные */}
          {activeMods.some(a => a.status === 'stopped') && (
            <Button 
              danger 
              type="dashed"
              onClick={clearStoppedMod}
              style={{ marginRight: '8px' }}
            >
              🗑️ Очистить остановленные (
              {activeMods.filter(a => a.status === 'stopped').length}
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
              <p>У вас пока нет запущенных атак.</p>
              {/* <p>Хотите запустить атаку?</p> */}
            </div>
            {/* <div className="centered">
              <Button
                color="danger"
                variant="solid"
                onClick={() =>
                  handleButtonClick("modified", "mod", "Ваши атаки")
                }
              >
                Да!
              </Button>
            </div> */}
          </Space>
        </div>
      )}
      <Divider />
      <p style={{ 
        textAlign: "center",
        fontSize: "28px",           // ✅ БОЛЬШОЙ размер
        color: "#722ed1",           // ✅ КРАСНЫЙ цвет
        fontWeight: "bold",         // ✅ ЖИРНЫЙ
        fontFamily: "Arial Black, sans-serif",  // ✅ Крутой шрифт
        textShadow: "2px 2px 4px rgba(0,0,0,0.3)",  // ✅ Тень для объёма
        margin: "20px 0",
        letterSpacing: "1px"        // ✅ Расстояние между буквами
      }}>
      Запущенные шаблоны атак
      </p>
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
                  {attack.status === 'running' && (
                    <div>
                      {attack.mode !== 'topspeed' && (
                        <Button size="small" onClick={() => pauseAttack(attack.id)}>
                          ⏸️ Пауза
                        </Button>
                      )}
                      <Button danger size="small" onClick={() => stopAttack(attack.id)}>
                        🛑 Остановить
                      </Button>
                      {/* <Button
                        size="small"
                        onClick={async () => {
                          try {
                            const data = await getAttackStatus(attack.id);
                            console.log("STATUS:", data);
                            // при желании можно показать message:
                            // message.info(`PID ${data.pid}, alive=${data.alive}, status=${data.status}`);
                          } catch (e) {
                            console.error(e);
                            message.error("Не удалось получить статус");
                          }
                        }}
                      >
                        🔍 Статус
                      </Button> */}
                    </div>
                  )}
                  {attack.status === 'paused' && (
                    <div>
                      <Button type="primary" size="small" onClick={() => resumeAttack(attack.id)}>
                      ▶️ Продолжить
                    </Button>
                    {/* <Button
                      size="small"
                      onClick={async () => {
                        try {
                          const data = await getAttackStatus(attack.id);
                          console.log("STATUS:", data);
                          // при желании можно показать message:
                          // message.info(`PID ${data.pid}, alive=${data.alive}, status=${data.status}`);
                        } catch (e) {
                          console.error(e);
                          message.error("Не удалось получить статус");
                        }
                      }}
                    >
                      🔍 Статус
                    </Button> */}
                    </div>
                  )}
                  {attack.status === 'stopped' && <Tag color="error">🛑 Остановлена</Tag>}
                  {attack.status === 'completed' && <Tag color="success">✅ Завершено</Tag>}
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
                    value={Date.now() + (attack.effectiveDuration - attack.elapsed) * 1000} 
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
                {attack.status === 'running' && attack.mode === 'loop' && (
                  <Space>
                    <Button 
                      size="small" 
                      onClick={() => pauseAttack(attack.id)}  // ✅ Текущий круг!
                    >
                      ⏸️ Пауза сейчас (круг {attack.loopCurrent + 1}/{attack.loopTotal})
                    </Button>
                    <Button danger size="small" onClick={() => stopAttack(attack.id)}>
                      🛑 Остановить
                    </Button>
                  </Space>
                )}
              </div>
            ))}
          </div>
          {/* ✅ Кнопка очистки */}
          {activeAttacks.some(a => a.status === 'completed') && (
            <Button 
              onClick={clearCompletedAttack} 
              type="dashed"
              className="green-hover-btn"
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
              {/* <p>Хотите запустить шаблон атаки?</p> */}
            </div>
            {/* <div className="centered">
              <Button
                color="purple"
                variant="solid"
                onClick={() =>
                  handleButtonClick("attack", "attack", "Шаблоны атак")
                }
              >
                Да!
              </Button>
            </div> */}
          </Space>
        </div>
      )}
      <Divider />
      <p style={{ 
        textAlign: "center",
        fontSize: "28px",           // ✅ БОЛЬШОЙ размер
        color: "#1677ff",           // ✅ КРАСНЫЙ цвет
        fontWeight: "bold",         // ✅ ЖИРНЫЙ
        fontFamily: "Arial Black, sans-serif",  // ✅ Крутой шрифт
        textShadow: "2px 2px 4px rgba(0,0,0,0.3)",  // ✅ Тень для объёма
        margin: "20px 0",
        letterSpacing: "1px"        // ✅ Расстояние между буквами
      }}>
      Запущенный фоновый трафик
      </p>
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
                  {attack.status === 'running' && (
                    <div>
                      {attack.mode !== 'topspeed' && (
                        <Button size="small" onClick={() => pauseBg(attack.id)}>
                          ⏸️ Пауза
                        </Button>
                      )}
                      <Button danger size="small" onClick={() => stopBg(attack.id)}>
                        🛑 Остановить
                      </Button>
                      {/* <Button
                        size="small"
                        onClick={async () => {
                          try {
                            const data = await getAttackStatus(attack.id);
                            console.log("STATUS:", data);
                            // при желании можно показать message:
                            // message.info(`PID ${data.pid}, alive=${data.alive}, status=${data.status}`);
                          } catch (e) {
                            console.error(e);
                            message.error("Не удалось получить статус");
                          }
                        }}
                      >
                        🔍 Статус
                      </Button> */}
                    </div>
                  )}
                  {attack.status === 'paused' && (
                    <div>
                      <Button type="primary" size="small" onClick={() => resumeBg(attack.id)}>
                      ▶️ Продолжить
                    </Button>
                    {/* <Button
                      size="small"
                      onClick={async () => {
                        try {
                          const data = await getAttackStatus(attack.id);
                          console.log("STATUS:", data);
                          // при желании можно показать message:
                          // message.info(`PID ${data.pid}, alive=${data.alive}, status=${data.status}`);
                        } catch (e) {
                          console.error(e);
                          message.error("Не удалось получить статус");
                        }
                      }}
                    >
                      🔍 Статус
                    </Button> */}
                    </div>
                  )}
                  {attack.status === 'stopped' && <Tag color="error">🛑 Остановлена</Tag>}
                  {attack.status === 'completed' && <Tag color="success">✅ Завершено</Tag>}
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
                    value={Date.now() + (attack.effectiveDuration - attack.elapsed) * 1000} 
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
                {attack.status === 'running' && attack.mode === 'loop' && (
                  <Space>
                    <Button 
                      size="small" 
                      onClick={() => pauseBg(attack.id)}  // ✅ Текущий круг!
                    >
                      ⏸️ Пауза сейчас (круг {attack.loopCurrent + 1}/{attack.loopTotal})
                    </Button>
                    <Button danger size="small" onClick={() => stopBg(attack.id)}>
                      🛑 Остановить
                    </Button>
                  </Space>
                )}
              </div>
            ))}
          </div>
          
          {/* ✅ Кнопка очистки */}
          {activeBgs.some(a => a.status === 'completed') && (
            <Button 
              onClick={clearCompletedBg} 
              type="dashed"
              className="green-hover-btn"
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
              {/* <p>Хотите запустить фоновый трафик?</p> */}
            </div>
            {/* <div className="centered">
              <Button
                color="primary"
                variant="solid"
                onClick={() =>
                  handleButtonClick("background", "background", "Фоновый трафик")
                }
              >
                Да!
              </Button>
            </div> */}
          </Space>
        </div>
      )}
      <Divider />
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
        open={openUpload}
        title={"Загрузка в " + header}
        onCancel={() => handleCancelUpload(activeTable)}
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
          <Dragger 
            {...props}
          >
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
