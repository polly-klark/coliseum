import React from "react";
import dayjs from "dayjs";
import { Table, Space, message, Button, Statistic } from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";

const { Column } = Table;
const { Countdown } = Statistic;

const ModTable = ({ data, user, token, fetchData }) => {
  const [stopFilename, setStopFilename] = React.useState("ничего");
  const [deadLine, setDeadLine] = React.useState(0);
  const onFinish = () => {
    setDeadLine(0);
    setStopFilename("ничего");
  };
  const handleDelete = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке

    try {
      await axios.delete(`http://192.168.42.129:8000/modified/${filename}`, {
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
      const response = await axios.get(`http://192.168.42.129:8000/downloadfile/${filename}`, {
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
    event.preventDefault(); // Предотвращаем переход по ссылке
    console.log(`Проигрывается файл ${filename}`);
    setStopFilename(filename)
    try {
      const response = await axios.post(`http://192.168.42.129:8000/play/${filename}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const parsedData = JSON.parse(response.data);
      const duration = Date.now() + parseFloat(parsedData.duration) * 1000;
      setDeadLine(duration);
      message.success(`Файл "${filename}" успешно передан на запуск`);
    } catch (error) {
      console.error("Ошибка при передаче файла:", error);
      message.error(`Ошибка при передаче файла "${filename}"`);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post(`http://192.168.42.129:8000/stop`);
      message.success(`Процесс успешно остановлен`);
      setDeadLine(0);
    } catch (error) {
      console.error("Ошибка при остановке:", error);
      message.error(`Ошибка при остановке`);
    }
  }

  return (
    <>
      <Space>
        <p>Сейчас проигрывается {stopFilename}</p>
        {stopFilename !== "ничего" && (<Button onClick={() => handleStop()}>Остановить</Button>)}
        {stopFilename === "ничего" && (<Button disabled>Остановить</Button>)}
        <Countdown value={deadLine} onFinish={onFinish} />
      </Space>
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
                onClick={(event) => handlePlay(record.filename, event)}
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
    </>
  );
};

export default ModTable;
