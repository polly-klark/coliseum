import React from "react";
import dayjs from "dayjs";
import { Table, Space, message } from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";

const { Column } = Table;

const AttackTable = ({ data, user, token, fetchData }) => {
  
  const handleDelete = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке

    try {
      await axios.delete(`http://localhost:8000/attack/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success(`Файл "${filename}" успешно удален`);
      // Вызываем fetchData для обновления данных
      await fetchData("attack"); // Дождитесь завершения fetchData
    } catch (error) {
      console.error("Ошибка при удалении файла:", error);
      message.error(`Ошибка при удалении файла "${filename}"`);
    }
  };

  return (
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
            <a>Запустить {record.lastName}</a>
            <a>Модифицировать</a>
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
  );
};

export default AttackTable;
