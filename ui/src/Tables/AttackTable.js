import React from "react";
import dayjs from "dayjs";
import {
  Table,
  Space,
  message,
  Modal,
  Form,
  Button,
  Input,
  Checkbox,
} from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";

const { Column } = Table;

const AttackTable = ({ data, user, token, fetchData }) => {
  const [open, setOpen] = React.useState(false);
  const [selectedFilename, setSelectedFilename] = React.useState("");
  const [stopFilename, setStopFilename] = React.useState("ничего");
  const [fileData, setFileData] = React.useState([]);
  // Состояние для отслеживания активных строк
  const [activeRows, setActiveRows] = React.useState({});
  // Создаем экземпляр формы
  const [form] = Form.useForm();
  // const initialValues = {
  //   // Задайте начальные значения
  //   ipForward: "",
  //   ipVictim: "",
  // };

  // Обработчик изменения чекбокса
  const handleCheckboxChange = (key) => {
    setActiveRows((prev) => ({
      ...prev,
      [key]: !prev[key], // Переключение состояния
    }));
  };

  // Определение колонок таблицы
  const columns = [
    {
      title: "№ п/п",
      dataIndex: "key",
      key: "key",
      render: (_, __, index) => index + 1, // Порядковый номер строки
    },
    {
      title: "Изменить",
      dataIndex: "checkbox",
      key: "checkbox",
      render: (_, record) => (
        <Checkbox
          checked={activeRows[record.key] || false}
          onChange={() => handleCheckboxChange(record.key)}
        />
      ),
    },
    {
      title: "Исходный IP-адрес",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: "Новый IP-адрес данных",
      dataIndex: "input",
      key: "input",
      render: (_, record) => (
        <Input
          disabled={!activeRows[record.key]} // Input активен только если чекбокс включен
          placeholder="Введите данные"
        />
      ),
    },
  ];

  const handlePlay = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке
    console.log(`Проигрывается файл ${filename}`);
    setStopFilename(filename);
    try {
      await axios.post(`http://localhost:8000/play_attack/${filename}`, {
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

  const handleModification = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке
    setOpen(true);
    setSelectedFilename(filename);
    try {
      const response = await axios.get(`http://localhost:8000/modification_list/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileData(response.data);
      console.log(response.data)
    } catch (error) {
      console.error("Ошибка при получении данных:", error);
      setFileData([]); // В случае ошибки устанавливаем пустой массив
    }
  };
  const handleMod = async (filename, ip_forward, ip_victim) => {
    try {
      await axios.post(
        `http://localhost:8000/modification/${filename}`,
        {
          ip_forward: ip_forward,
          ip_victim: ip_victim,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success(
        `Файл "${filename}" успешно изменён и помещён в "Ваши атаки"`
      );
    } catch (error) {
      console.error("Ошибка при модификации файла:", error);
      message.error(`Ошибка при модификации файла "${filename}"`);
    }
    setOpen(false);
    console.log(ip_forward, ip_victim);
    form.resetFields(); // Сбрасываем значения при открытии модального окна
  };
  const handleCancel = () => {
    setOpen(false);
    setSelectedFilename(""); // Очищаем имя файла при закрытии модального окна
    form.resetFields(); // Сбрасываем значения при открытии модального окна
  };
  const handleStop = async () => {
    try {
      await axios.post(`http://localhost:8000/stop`);
      message.success(`Процесс успешно остановлен`);
    } catch (error) {
      console.error("Ошибка при остановке:", error);
      message.error(`Ошибка при остановке`);
    }
  };

  return (
    <>
      <Space>
        <p>Сейчас проигрывается {stopFilename}</p>
        {stopFilename !== "ничего" && (
          <Button onClick={() => handleStop()}>Остановить</Button>
        )}
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
              <a
                href="#"
                onClick={(event) => handleModification(record.filename, event)}
              >
                Модифицировать
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
      <Modal
        open={open}
        title={"Модификация " + selectedFilename}
        onCancel={handleCancel}
        width={700}
        footer={[
          <Button
            key="back"
            color="cyan"
            variant="outlined"
            onClick={handleCancel}
          >
            Отмена
          </Button>,
          <Button
            key="submit"
            color="pink"
            variant="solid"
            onClick={() => {
              // Используем validateFields для проверки полей перед вызовом handleMod
              form
                .validateFields()
                .then((values) => {
                  handleMod(
                    selectedFilename,
                    values.ipForward,
                    values.ipVictim
                  );
                })
                .catch((info) => {
                  console.log("Валидация не прошла:", info);
                });
            }}
          >
            Модифицировать
          </Button>,
        ]}
      >
        <Table 
      dataSource={fileData} 
      columns={columns} 
      rowKey="key" // Уникальный ключ строки
    />
      </Modal>
    </>
  );
};

export default AttackTable;
