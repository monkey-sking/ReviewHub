import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Button, Space, Typography, Divider, List, Tag, Modal, message, Empty, Spin } from 'antd';
import { HistoryOutlined, CheckCircleOutlined, WarningOutlined, CopyOutlined, FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const Recap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [targetDate, setTargetDate] = useState(dayjs().subtract(1, 'day'));
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = (date: any) => {
    setLoading(true);
    const dateStr = date.format('YYYY-MM-DD');
    axios.get(`/api/recap?date=${dateStr}`)
      .then(res => setData(res.data))
      .catch(() => message.error('获取复盘数据失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData(targetDate);
  }, [targetDate]);

  const generateReport = () => {
    if (!data) return '';
    const { summary, top_items, date } = data;
    
    return `前日复盘（${date}）

完成：${summary.completed_count} 项，涉及 ${summary.projects_touched_count} 个项目。
异常：新增 ${summary.new_exception_count} 项，当前未闭环 ${summary.open_exception_count} 项。
待处理：待审批 ${summary.pending_approval_count} 项，需人工支持 ${summary.needs_human_count} 项，跨天未闭环 ${summary.carryover_count} 项。

今日重点：
1. ${top_items.carryover_items[0]?.title || '处理存量阻塞任务'}
2. ${top_items.new_exceptions[0]?.title || '跟进系统异常信号'}
3. 检查并推进待审批队列`;
  };

  const copyToClipboard = () => {
    const text = generateReport();
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  if (loading && !data) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin tip="正在生成聚合复盘..." /></div>;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small">
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <CalendarOutlined />
              <Text strong>复盘日期:</Text>
              <DatePicker 
                value={targetDate} 
                onChange={(val) => val && setTargetDate(val)} 
                allowClear={false}
              />
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => setModalVisible(true)}>
              生成晨报草稿
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="昨日完成" 
              value={data?.summary.completed_count} 
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="新增异常" 
              value={data?.summary.new_exception_count} 
              valueStyle={{ color: '#f5222d' }}
              prefix={<WarningOutlined />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="待审批项" 
              value={data?.summary.pending_approval_count} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="跨天未闭环" 
              value={data?.summary.carryover_count} 
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="重点完成事项" size="small">
            <List
              dataSource={data?.top_items.notable_completions}
              renderItem={(item: any) => (
                <List.Item>
                  <Space>
                    <Tag color="green">DONE</Tag>
                    <Text strong>{item.title}</Text>
                    <Text type="secondary">({item.project_name})</Text>
                  </Space>
                </List.Item>
              )}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="昨日无完成项" /> }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="新增/高危异常" size="small">
            <List
              dataSource={data?.top_items.new_exceptions}
              renderItem={(item: any) => (
                <List.Item>
                  <Space>
                    <Tag color={item.severity === 'critical' ? 'red' : 'orange'}>{item.severity.toUpperCase()}</Tag>
                    <Text strong>{item.title}</Text>
                  </Space>
                </List.Item>
              )}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="昨日无新增异常" /> }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="跨天未闭环事项 (Carryover)" size="small">
        <List
          dataSource={data?.top_items.carryover_items}
          renderItem={(item: any) => (
            <List.Item>
              <Space>
                <Tag color="warning">STUCK</Tag>
                <Text strong>{item.title}</Text>
                <Divider type="vertical" />
                <Text type="secondary">状态: {item.reason}</Text>
              </Space>
            </List.Item>
          )}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无积压事项" /> }}
        />
      </Card>

      <Modal
        title="晨报草稿 (建议复制后微调)"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copyToClipboard}>
            复制全文
          </Button>
        ]}
      >
        <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
          {generateReport()}
        </pre>
      </Modal>
    </Space>
  );
};

export default Recap;
