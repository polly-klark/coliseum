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
  Statistic,
  Tabs,
  Radio,
  Divider,
  notification,
} from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";
import { usePlay } from '../Dashboard';

const { Column } = Table;
const { Countdown } = Statistic;

const AttackTable = ({ data, user, token, fetchData }) => {
  const [api, contextHolder] = notification.useNotification();
  const openNotificationWithIcon = type => {
    api[type]({
      message: 'Информация',
      description:
        'Если не изменить параметр "Имя файла", то по умолчанию к старому названию добавится "_modified".',
    });
  };
  const { 
    stopFilenameAttack, setStopFilenameAttack, 
    deadLineAttack, setDeadLineAttack, 
    onFinishAttack, 
    remainingTimeAttack, setRemainingTimeAttack,
    initialRemainingTimeRefAttack 
  } = usePlay();
  const [open, setOpen] = React.useState(false);
  const [portBox, setPortBox] = React.useState(false);
  const [IPBox, setIPBox] = React.useState(false);
  const [MACBox, setMACBox] = React.useState(false);
  const [TTLBox, setTTLBox] = React.useState(false);
  const [nameBox, setNameBox] = React.useState(false);
  const [keyOfTab, setKeyOfTab] = React.useState("1");
  const [selectedFilename, setSelectedFilename] = React.useState("");
  const [newFilename, setNewFilename] = React.useState(selectedFilename);
  const [valueRadio, setValueRadio] = React.useState();
  const onChangeRadio = e => {
    setValueRadio(e.target.value);
  };
  const [disabledRadio, setDisabledRadio] = React.useState(true);
  const toggleDisabledPort = () => {
    setDisabledRadio(!disabledRadio);
    setPortBox(!portBox);
  };
  const toggleDisabledIP = () => {
    setIPBox(!IPBox);
  };
  const toggleDisabledMAC = () => {
    setMACBox(!MACBox);
  };
  const toggleDisabledTTL = () => {
    setTTLBox(!TTLBox);
  };
  const toggleDisabledName = () => {
    setNameBox(!nameBox);
  };
  const [fileData, setFileData] = React.useState([]);
  // Состояние для отслеживания активных строк
  const [activeRows, setActiveRows] = React.useState({});
  const [inputValues, setInputValues] = React.useState({});
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

  // Обработчик изменения Input
  const handleInputChange = (key, value) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
  };

  // Добавьте функцию сброса состояний
  const resetForm = () => {
    setActiveRows({});
    setInputValues({});
  };

  // Получение активных строк при нажатии кнопки
  const getActiveRows = async (filename) => {
    const result = Object.keys(activeRows)
      .filter((key) => activeRows[key])
      .map((key) => {
        // Ищем запись по любому из ключей
        const record = fileData.find((item) => 
          item.ip_key === key || item.tcp_key === key || item.udp_key === key || item.mac_key === key || item.ttl_key === key
        );

        console.log("🔍 Все ключи fileData:", fileData.map(item => ({
          ip_key: item.ip_key, 
          tcp_key: item.tcp_key, 
          udp_key: item.udp_key, 
          mac_key: item.mac_key,  // ← Проверь есть ли!
          ttl_key: item.ttl_key
        })));
        
        if (!record) return null;
        
        // ✅ Извлекаем ЧИСЛОВОЙ индекс из ключа
      const match = key.match(/(\w+)_(\d+)/);  // ip_1, tcp_2, udp_0
      if (!match) return null;
      
      const type = match[1];  // "ip", "tcp", "udp"
      const index = parseInt(match[2]);  // 1, 2, 0
      
      if (type === 'ip') {
        return {
          key,  // "ip_1" — для логов
          index,  // 1 — для бэкенда
          ip: inputValues[key] || record.ip,
        };
      } else if (type === 'tcp') {
        return {
          key,
          index,
          tcp_port: inputValues[key] || record.tcp_port,
        };
      } else if (type === 'udp') {
        return {
          key, 
          index,
          udp_port: inputValues[key] || record.udp_port,
        };
      } else if (type === 'mac') {  // ✅ Новый блок
        return {
          key,
          index,
          mac: inputValues[key] || record.mac,
        };
      } else if (type === 'ttl') {  // ✅ Новый блок
        return {
          key,
          index,
          ttl: inputValues[key] || record.ttl,
        };
      }
      return null;
    })
    .filter(Boolean); // Убираем null
    
    console.log("Активные строки:", result);
    // console.log(`ip: ${JSON.stringify(result.filter(item => item.ip).map(item => ({
    //   key: parseInt(item.key.split('_')[1]),
    //   ip: item.ip
    // })), null, 2)}`);  
    try {
      await axios.post(
        `http://127.0.0.1:8000/modification/${filename}`,
        {
          filename: newFilename,
          ip_items: result.filter(item => item.ip).map(item => ({
            key: parseInt(item.key.split('_')[1]),  // 0, 3, 10
            ip: item.ip  // Новое значение!
          })),
          tcp_port_items: result.filter(item => item.tcp_port).map(item => ({
            key: parseInt(item.key.split('_')[1]),
            tcp_port: item.tcp_port
          })),
          udp_port_items: result.filter(item => item.udp_port).map(item => ({
            key: parseInt(item.key.split('_')[1]),
            udp_port: item.udp_port
          })),
          mac_items: result.filter(item => item.mac).map(item => ({
            key: parseInt(item.key.split('_')[1]),
            mac: item.mac
          })),
          ttl_items: result.filter(item => item.ttl).map(item => ({
            key: parseInt(item.key.split('_')[1]),
            ttl: item.ttl
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
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
    console.log(`"${newFilename}"`);
    setNewFilename("");
    setOpen(false);
    setDisabledRadio(true);
    setValueRadio();
    setKeyOfTab("1");
    setPortBox(false);
    setIPBox(false);
    setMACBox(false);
    resetForm();
  };

  // Определение колонок таблицы
  const ip_columns = [
    {
      title: "№ п/п",
      dataIndex: "ip_key",
      key: "ip_key",
      render: (_, __, index) => index + 1, // Порядковый номер строки
    },
    {
      title: "Изменить",
      dataIndex: "checkbox",
      key: "checkbox",
      render: (_, record) => (
        <Checkbox
          checked={activeRows[record.ip_key] || false}  // ← record.ip_key!
          onChange={() => handleCheckboxChange(record.ip_key)}  // ← record.ip_key!
        />
      ),
    },
    {
      title: "Исходный IP-адрес",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: "Новый IP-адрес",
      dataIndex: "input",
      key: "input",
      render: (_, record) => (
        <Input
          disabled={!activeRows[record.ip_key]}  // ← record.ip_key!
          value={inputValues[record.ip_key] || ""}
          onChange={(e) => handleInputChange(record.ip_key, e.target.value)}
          placeholder="Введите данные"
        />
      ),
    },
  ];
  // Определение колонок таблицы
  const tcp_columns = [
    {
      title: "№ п/п",
      dataIndex: "tcp_key",
      key: "tcp_key",
      render: (_, __, index) => index + 1, // Порядковый номер строки
    },
    {
      title: "Изменить",
      dataIndex: "checkbox",
      key: "checkbox",
      render: (_, record) => (
        <Checkbox
          checked={activeRows[record.tcp_key] || false}
          onChange={() => handleCheckboxChange(record.tcp_key)}
        />
      ),
    },
    {
      title: "Исходный TCP-порт",
      dataIndex: "tcp_port",
      key: "tcp_port",
    },
    {
      title: "Новый TCP-порт",
      dataIndex: "input",
      key: "input",
      render: (_, record) => (
        <Input
          disabled={!activeRows[record.tcp_key]} // Input активен только если чекбокс включен
          value={inputValues[record.tcp_key] || ""}
          onChange={(e) => handleInputChange(record.tcp_key, e.target.value)}
          placeholder="Введите данные"
        />
      ),
    },
  ];
  // Определение колонок таблицы
  const udp_columns = [
    {
      title: "№ п/п",
      dataIndex: "udp_key",
      key: "udp_key",
      render: (_, __, index) => index + 1, // Порядковый номер строки
    },
    {
      title: "Изменить",
      dataIndex: "checkbox",
      key: "checkbox",
      render: (_, record) => (
        <Checkbox
          checked={activeRows[record.udp_key] || false}
          onChange={() => handleCheckboxChange(record.udp_key)}
        />
      ),
    },
    {
      title: "Исходный UDP-порт",
      dataIndex: "udp_port",
      key: "udp_port",
    },
    {
      title: "Новый UDP-порт",
      dataIndex: "input",
      key: "input",
      render: (_, record) => (
        <Input
          disabled={!activeRows[record.udp_key]} // Input активен только если чекбокс включен
          value={inputValues[record.udp_key] || ""}
          onChange={(e) => handleInputChange(record.udp_key, e.target.value)}
          placeholder="Введите данные"
        />
      ),
    },
  ];
  const mac_columns = [
    {
      title: "№ п/п",
      dataIndex: "mac_key",
      key: "mac_key",
      render: (_, __, index) => index + 1, // Порядковый номер строки
    },
    {
      title: "Изменить",
      dataIndex: "checkbox",
      key: "checkbox",
      render: (_, record) => (
        <Checkbox
          checked={activeRows[record.mac_key] || false}  // ← record.ip_key!
          onChange={() => handleCheckboxChange(record.mac_key)}  // ← record.ip_key!
        />
      ),
    },
    {
      title: "Исходный MAC-адрес",
      dataIndex: "mac",
      key: "mac",
    },
    {
      title: "Новый IP-адрес",
      dataIndex: "input",
      key: "input",
      render: (_, record) => (
        <Input
          disabled={!activeRows[record.mac_key]}  // ← record.ip_key!
          value={inputValues[record.mac_key] || ""}
          onChange={(e) => handleInputChange(record.mac_key, e.target.value)}
          placeholder="Введите данные"
        />
      ),
    },
  ];
  const ttl_columns = [
    {
      title: "№ п/п",
      dataIndex: "ttl_key",
      key: "ttl_key",
      render: (_, __, index) => index + 1, // Порядковый номер строки
    },
    {
      title: "Изменить",
      dataIndex: "checkbox",
      key: "checkbox",
      render: (_, record) => (
        <Checkbox
          checked={activeRows[record.ttl_key] || false}  // ← record.ip_key!
          onChange={() => handleCheckboxChange(record.ttl_key)}  // ← record.ip_key!
        />
      ),
    },
    {
      title: "Исходный TTL",
      dataIndex: "ttl",
      key: "ttl",
    },
    {
      title: "Новый TTL",
      dataIndex: "input",
      key: "input",
      render: (_, record) => (
        <Input
          disabled={!activeRows[record.ttl_key]}  // ← record.ip_key!
          value={inputValues[record.ttl_key] || ""}
          onChange={(e) => handleInputChange(record.ttl_key, e.target.value)}
          placeholder="Введите данные"
        />
      ),
    },
  ];

  const styleRadio = {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  };

  const ipData = React.useMemo(() => fileData.filter(item => item.ip_key), [fileData]);
  const tcpData = React.useMemo(() => fileData.filter(item => item.tcp_key), [fileData]);
  const udpData = React.useMemo(() => fileData.filter(item => item.udp_key), [fileData]);
  const macData = React.useMemo(() => fileData.filter(item => item.mac_key), [fileData]);
  const ttlData = React.useMemo(() => fileData.filter(item => item.ttl_key), [fileData]);

  const itemsOfTabs = [
    {
      key: '1',
      label: 'Имя файла',
      children:
      <>
        <Checkbox onChange={toggleDisabledName} checked={nameBox}>Необходимо поменять</Checkbox>
        <Divider />
        <Input
        disabled={!nameBox}
        value={newFilename}
        style={{ width: 200 }}
        onChange={(e) => setNewFilename(e.target.value)}
        />
      </>
    },
    {
      key: '2',
      label: 'IP-адреса',
      children:
      <>
        <Checkbox onChange={toggleDisabledIP} checked={IPBox}>Необходимо поменять</Checkbox>
        <Divider />
        {IPBox && (
          <Table
          dataSource={ipData}
          columns={ip_columns}
          rowKey="ip_key" // Уникальный ключ строки
          />
        )}
      </>
    },
    {
      key: '3',
      label: 'Порты',
      children: 
      <>
        <Checkbox onChange={toggleDisabledPort} checked={portBox}>Необходимо поменять</Checkbox>
        <Divider />
        <Radio.Group
          disabled={disabledRadio}
          style={styleRadio}
          onChange={onChangeRadio}
          value={valueRadio}
          options={[
            { value: 1, label: 'TCP' },
            { value: 2, label: 'UDP' },
          ]}
        />
        {valueRadio === 1 && (
          <>
            <Divider />
            <Table
              dataSource={tcpData}
              columns={tcp_columns}
              rowKey="tcp_key"
            />
          </>
        )}
        {valueRadio === 2 && (
          <>
            <Divider />
            <Table
              dataSource={udpData}
              columns={udp_columns}
              rowKey="udp_key"
            />
          </>
        )}
      </>,
    },
    {
      key: '4',
      label: 'MAC-адреса',
      children:
      <>
        <Checkbox onChange={toggleDisabledMAC} checked={MACBox}>Необходимо поменять</Checkbox>
        <Divider />
        {MACBox && (
          <Table
          dataSource={macData}
          columns={mac_columns}
          rowKey="mac_key" // Уникальный ключ строки
          />
        )}
      </>
    },
    {
      key: '5',
      label: 'TTL',
      children:
      <>
        <Checkbox onChange={toggleDisabledTTL} checked={TTLBox}>Необходимо поменять</Checkbox>
        <Divider />
        {TTLBox && (
          <Table
          dataSource={ttlData}
          columns={ttl_columns}
          rowKey="ttl_key" // Уникальный ключ строки
          />
        )}
      </>
    },
  ];

  const handlePlay = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке
    console.log(`Проигрывается файл ${filename}`);
    setStopFilenameAttack(filename);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/play_attack/${filename}`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const parsedData = JSON.parse(response.data);
      const duration = Date.now() + parseFloat(parsedData.duration) * 1000;
      setDeadLineAttack(duration);
      setRemainingTimeAttack(parsedData.duration * 1000);
      initialRemainingTimeRefAttack.current = parsedData.duration * 1000
      message.success(`Файл "${filename}" успешно передан на запуск`);
    } catch (error) {
      console.error("Ошибка при передаче файла:", error);
      message.error(`Ошибка при передаче файла "${filename}"`);
    }
  };

  const handleDelete = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке

    try {
      await axios.delete(`http://127.0.0.1:8000/attack/${filename}`, {
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

  const handleDownload = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке downloadbackground

    try {
      const response = await axios.get(`http://127.0.0.1:8000/downloadattack/${filename}`, {
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

  const handleModification = async (filename, event) => {
    event.preventDefault(); // Предотвращаем переход по ссылке
    setOpen(true);
    setSelectedFilename(filename);
    setNewFilename(filename);
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/modification_list/${filename}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // ✅ ОТДЕЛЬНЫЕ СЧЁТЧИКИ ДЛЯ КАЖДОГО ТИПА
      let ipIndex = 0;
      let tcpIndex = 0;
      let udpIndex = 0;
      let macIndex = 0;
      let ttlIndex = 0;
      const fileDataWithUniqueKeys = response.data.map((item) => {
        if (item.ip) {
          // IP — свой счётчик
          return {
            ...item,
            ip_key: `ip_${ipIndex++}`,  // ip_0, ip_1, ip_2...
          };
        } else if (item.tcp_port) {
          // TCP — свой счётчик  
          return {
            ...item,
            tcp_key: `tcp_${tcpIndex++}`,  // tcp_0, tcp_1, tcp_2...
          }; 
        } else if (item.udp_port) {
          // UDP — свой счётчик
          return {
            ...item,
            udp_key: `udp_${udpIndex++}`,  // udp_0, udp_1, udp_2...
          };
        } else if (item.mac) {
          // UDP — свой счётчик
          return {
            ...item,
            mac_key: `mac_${macIndex++}`,  // mac_0, mac_1, mac_2...
          };
        } else if (item.ttl) {
          // UDP — свой счётчик
          return {
            ...item,
            ttl_key: `ttl_${ttlIndex++}`,  // ttl_0, ttl_1, ttl_2...
          };
        }
      return item;
    });

    setFileData(fileDataWithUniqueKeys);
    setActiveRows({});
    setInputValues({});

      // console.log(response.data);
      // console.log(ipData);
      // console.log(tcpData);
      // console.log(udpData);
    } catch (error) {
      console.error("Ошибка при получении данных:", error);
      setFileData([]); // В случае ошибки устанавливаем пустой массив
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setDisabledRadio(true);
    setValueRadio();
    setKeyOfTab("1");
    setPortBox(false);
    setIPBox(false);
    setMACBox(false);
    setTTLBox(false);
    setNameBox(false);
    setSelectedFilename(""); // Очищаем имя файла при закрытии модального окна
    form.resetFields(); // Сбрасываем значения при открытии модального окна
  };
  // const handleStop = async () => {
  //   try {
  //     await axios.post(`http://127.0.0.1:8000/stop`);
  //     message.success(`Процесс успешно остановлен`);
  //     setDeadLineAttack(0);
  //   } catch (error) {
  //     console.error("Ошибка при остановке:", error);
  //     message.error(`Ошибка при остановке`);
  //   }
  // };

  return (
    <>
      {contextHolder}
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
                onClick={(event) => { 
                  handleModification(record.filename, event);
                  openNotificationWithIcon('info');
                }}
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
            onClick={() => getActiveRows(selectedFilename)}
          >
            Модифицировать
          </Button>,
        ]}
      >
        <Tabs
          activeKey={keyOfTab}   // управляемая активная вкладка
          onChange={(key) => setKeyOfTab(key)}  // обновление состояния при переключении
          items={itemsOfTabs}
        />
      </Modal>
    </>
  );
};

export default AttackTable;
