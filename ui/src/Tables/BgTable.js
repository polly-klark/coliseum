import React from "react";
import dayjs from "dayjs";
import { Table, Space, message, Button } from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";

const { Column } = Table;

const BgTable = ({ data, user, token, fetchData }) => {
  const [stopFilename, setStopFilename] = React.useState("ничего");
  const handleDelete = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке

    try {
      await axios.delete(`http://localhost:8000/background/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success(`Файл "${filename}" успешно удален`);
      // Вызываем fetchData для обновления данных
      await fetchData("background"); // Дождитесь завершения fetchData
    } catch (error) {
      console.error("Ошибка при удалении файла:", error);
      message.error(`Ошибка при удалении файла "${filename}"`);
    }
  };

  const handlePlay = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке
    console.log(`Проигрывается файл ${filename}`);
    setStopFilename(filename);
    try {
      await axios.post(`http://localhost:8000/play_background/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success(`Файл "${filename}" успешно передан на запуск`);
    } catch (error) {
      console.error("Ошибка при передаче файла:", error);
      message.error(`Ошибка при передаче файла "${filename}"`);
    }
  };
  const handleStop = async () => {
    try {
      await axios.get(`http://localhost:8000/stop`);
      message.success(`Процесс успешно остановлен`);
    } catch (error) {
      console.error("Ошибка при остановке:", error);
      message.error(`Ошибка при остановке`);
    }
  }

  return (
    <>
      <Space>
        <p>Сейчас проигрывается {stopFilename}</p>
        {stopFilename !== "ничего" && <Button onClick={() => handleStop()}>Остановить</Button>}
        {stopFilename === "ничего" && <Button disabled>Остановить</Button>}
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
              {user === "admin" && (
                <a
                  href="#"
                  onClick={(event) => handleDelete(record.filename, event)}
                >
                  {/* Предотвращаем переход по ссылке */}Удалить
                </a>
              )}
            </Space>
          )}
        />
      </Table>
    </>
  );
};

export default BgTable;
