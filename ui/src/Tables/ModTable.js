import React from "react";
import dayjs from "dayjs";
import { Table, Space } from "antd";
import "../App.css"; // Импорт вашего CSS файла

const { Column } = Table;

const ModTable = ({ data }) => {
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
            <a>Удалить</a>
          </Space>
        )}
      />
    </Table>
  );
};


export default ModTable;
