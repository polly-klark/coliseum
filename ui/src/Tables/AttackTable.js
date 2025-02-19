import React from "react";
import dayjs from "dayjs";
import { Table, Space, message, Modal, Form, Button, Input } from "antd";
import "../App.css"; // Импорт вашего CSS файла
import axios from "axios";

const { Column } = Table;

const AttackTable = ({ data, user, token, fetchData }) => {
  const [ip_forward, setIp_forward] = React.useState("");
  const [ip_victim, setIp_victim] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [selectedFilename, setSelectedFilename] = React.useState("");
  // Создаем экземпляр формы
  const [form] = Form.useForm();
  const initialValues = {
    // Задайте начальные значения
    ipForward: "",
    ipVictim: "",
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
              <a>Запустить {record.lastName}</a>
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
        <Form
          form={form}
          name="modify"
          initialValues={initialValues}
          labelCol={{
            span: 8,
          }}
          wrapperCol={{
            span: 16,
          }}
          style={{
            maxWidth: 600,
          }}
          autoComplete="off"
        >
          <Form.Item
            label="IP-адрес атакующего"
            name="ipForward"
            rules={[
              {
                required: true,
                message: "Введите IP-адрес атакующего!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="IP-адрес жертвы"
            name="ipVictim"
            rules={[
              {
                required: true,
                message: "Введите IP-адрес жертвы!",
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AttackTable;
