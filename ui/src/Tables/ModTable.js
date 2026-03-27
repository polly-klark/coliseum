import React from "react";
import dayjs from "dayjs";
import { Table, Space, message, Button, Statistic, Divider, Typography, Modal, Radio, } from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";
import { usePlay } from '../Dashboard';

const { Column } = Table;
const { Countdown } = Statistic;

const ModTable = ({ data, user, token, fetchData }) => {
  const { 
    stopFilenameMod, setStopFilenameMod,
    deadLineMod, setDeadLineMod,
    onFinishMod,
    remainingTimeMod, setRemainingTimeMod,
    initialRemainingTimeRefMod,
    startMod,
    selectedMode, setSelectedMode,
    loopCount, setLoopCount,
    multiplier, setMultiplier,
    ppsValue, setPpsValue,
    renderModeOptions,
    openPlay, setOpenPlay,
    selectedFilename, setSelectedFilename,
    options, handlePlayModal,
  } = usePlay();
  const handleDelete = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке

    try {
      await axios.delete(`http://127.0.0.1:8000/modified/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success(`Файл "${filename}" успешно удален`);
      // Вызываем fetchData для обновления данных
      await fetchData("modified"); // Дождитесь завершения fetchData
    } catch (error) {
      console.error("Ошибка при удалении файла:", error);
      message.error(`Ошибка при удалении файла "${filename}"`);
    }
  };

  const handleDownload = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке downloadbackground

    try {
      const response = await axios.get(`http://127.0.0.1:8000/downloadfile/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(`Файл "${filename}" успешно передан на скачивание`);
    } catch (error) {
      console.error("Ошибка при получении файла:", error);
      message.error(`Ошибка при получении файла "${filename}"`);
    }
  };

  const handlePlay = async (filename, event) => {
    event.preventDefault();
    console.log(`Проигрывается файл ${filename} в режиме ${selectedMode}`);
  
    const attackId = Date.now() + Math.random().toString(36);
    const modeParams = {};
  
    // ✅ Берём значения из состояния инпутов
    switch (selectedMode) {
      case 'loop':
        modeParams.loop_count = loopCount;
        break;
      case 'mltiplier':
        modeParams.multiplier = multiplier;
        break;
      case 'pps':
        modeParams.pps = ppsValue;
        break;
    }
  
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/play/${filename}`,
        { 
          attack_id: attackId,
          mode: selectedMode,
          mode_params: modeParams
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      const parsedData = JSON.parse(response.data);
      startMod(filename, parseFloat(parsedData.duration), attackId, parsedData.pid || 0);
  
      message.success(`Файл "${filename}" запущен в режиме ${selectedMode}`);
    } catch (error) {
      console.error("Ошибка при передаче файла:", error);
      message.error(`Ошибка при запуске "${filename}"`);
    }
  };
  const handleCancelPlay = () => {
    setOpenPlay(false);
    setSelectedFilename("");
    setSelectedMode('standart');
    setLoopCount(5);      // ✅ сброс
    setMultiplier(2.0);   // ✅ сброс
    setPpsValue(200);     // ✅ сброс
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
  }

  return (
    <>
      <Table dataSource={data} rowKey="filename">
        <Column
          title="№ п/п"
          key="number"
          render={(text, record, index) => index + 1}
        />
        <Column title="Имя файла" dataIndex="filename" key="filename" />
        <Column title="Размер файла" dataIndex="length" key="length" />
        <Column
          title="Дата загрузки"
          dataIndex="upload_date"
          key="upload_date"
          render={(text, record) =>
            dayjs(record.upload_date).format("DD.MM.YYYY HH:mm")
          }
        />
        <Column
          title="Действие"
          key="action"
          render={(_, record) => (
            <Space size="middle">
              <a
                href="#"
                onClick={(event) => handlePlayModal(record.filename, event)}
              >
                Запустить
              </a>
              <a
                href="#"
                onClick={(event) => handleDelete(record.filename, event)}
              >
                Удалить
              </a>
              <a
                href="#"
                onClick={(event) => handleDownload(record.filename, event)}
              >
                Скачать
              </a>
            </Space>
          )}
        />
      </Table>
      <Modal
        open={openPlay}
        title={"Запуск " + selectedFilename}
        onCancel={handleCancelPlay}
        width={600}
        footer={[
          <Button
            key="back"
            color="cyan"
            variant="outlined"
            onClick={handleCancelPlay}
          >
            Закрыть
          </Button>,
          <Button
            key="submit"
            color="pink"
            variant="solid"
            onClick={(event) => handlePlay(selectedFilename, event)}
          >
            Запустить
          </Button>,
        ]}
      >
        <Typography.Title level={3} style={{ 
          textAlign: "center", 
          margin: "30px 0",
          color: "#000000"
        }}>
          Выберите режим проигрывания трафика
        </Typography.Title>
        <Radio.Group
          options={options}
          value={selectedMode}  // ✅ контролируемое значение
          onChange={(e) => setSelectedMode(e.target.value)} // ✅ получаем выбор
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}
        />
        <Divider />
        <div style={{ marginTop: '20px' }}>
          {renderModeOptions()}
        </div>
      </Modal>
    </>
  );
};

export default ModTable;
