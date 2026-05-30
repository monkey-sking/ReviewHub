import React, { useEffect, useState } from 'react';
import { Table, Tag, Typography, Button, Space, Card, Row, Col, Statistic, Input, message, Tabs, Modal, Form, DatePicker, Drawer, Descriptions, Divider, List, Badge, Empty } from 'antd';
import { CheckCircleOutlined, StopOutlined, InfoCircleOutlined, SearchOutlined, ClockCircleOutlined, RollbackOutlined, RocketOutlined, FileTextOutlined, SyncOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title, Paragraph } = Typography;

interface InboxItem {
  id: string;
  title: string;
  platform: string;
  project: string;
  status: string;
  action_state: string;
  action_label: string;
  risk: string;
  owner: string;
  notes?: string;
  reason?: string;
  missing_info: string[];
  requested_at: string;
  is_automation?: boolean;
  evidence?: {
    input_summary?: string;
    error_excerpt?: string;
    decision_context?: string;
    log_ref?: string;
  };
  retry?: {
    retryable: boolean;
    retry_handler?: string;
    retry_count?: number;
  };
}

const Inbox: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ items: InboxItem[], summary: any }>({ items: [], summary: {} });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('ready');
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [deferModalVisible, setDeferModalVisible] = useState(false);
  const [deferDate, setDeferDate] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/inbox')
      .then(res => setData(res.data))
      .catch(() => message.error('获取收件箱数据失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = (itemIds: React.Key[], action: string, extra: any = {}) => {
    setLoading(true);
    const isAutomation = selectedItem?.is_automation;
    const apiPath = isAutomation ? `/api/automation/${action}` : '/api/queue/actions';
    
    axios.post(apiPath, {
      item_ids: itemIds,
      action,
      note: actionNote,
      actor: '@operator',
      ...extra
    }).then(() => {
      message.success(`操作成功: ${action}`);
      setSelectedRowKeys([]);
      setSelectedItem(null);
      setActionNote('');
      fetchData();
    }).catch((err) => {
      message.error(`操作失败: ${err.response?.data?.error || err.message}`);
      setLoading(false);
    });
  };

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: InboxItem) => (
        <Space direction="vertical" size={0}>
          <Space>
            {record.is_automation && <Tag color="purple" style={{ fontSize: 10 }}>AUTO</Tag>}
            <Text strong style={{ fontSize: 13 }}>{text}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 10 }}>{record.platform} · {record.id}</Text>
        </Space>
      )
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      render: (p: string) => <Tag bordered={false} style={{ fontSize: 11 }}>{p || 'Unassigned'}</Tag>
    },
    {
      title: '状态',
      key: 'action_state',
      render: (_: any, record: InboxItem) => {
        let color = 'default';
        if (record.action_state === 'ready_to_execute') color = 'success';
        if (record.action_state === 'needs_review') color = 'processing';
        if (record.action_state === 'missing_info') color = 'warning';
        return <Tag color={color} style={{ fontSize: 11 }}>{record.action_label}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: InboxItem) => (
        <Button type="link" size="small" onClick={() => setSelectedItem(record)}>详情</Button>
      ),
    },
  ];

  const filteredItems = data.items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchText.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'ready') return item.action_state === 'ready_to_execute' && matchesSearch;
    if (activeTab === 'review') return item.action_state === 'needs_review' && matchesSearch;
    if (activeTab === 'blocked') return (item.action_state === 'missing_info' || item.action_state === 'deferred') && matchesSearch;
    return matchesSearch;
  });

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row gutter={12}>
        <Col span={6}><Card size="small"><Statistic title="待处理项" value={data.summary.total} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="待决策" value={data.summary.needs_review} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="可执行" value={data.summary.ready} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="阻塞/暂缓" value={data.summary.blocked} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
      </Row>

      <Card 
        size="small"
        title={
          <Tabs 
            size="small"
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              { key: 'ready', label: '可执行' },
              { key: 'review', label: '待决策' },
              { key: 'blocked', label: '阻塞中' },
              { key: 'all', label: '全部' },
            ]}
          />
        }
        extra={
          <Space>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="搜索..." 
              style={{ width: 160 }} 
              size="small"
              onChange={e => setSearchText(e.target.value)}
            />
          </Space>
        }
      >
        <Table 
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
          columns={columns} 
          dataSource={filteredItems.map(i => ({ ...i, key: i.id }))} 
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      <Drawer
        title={<Space><RocketOutlined /> 任务检查器 (Inspector)</Space>}
        width={600}
        onClose={() => setSelectedItem(null)}
        open={!!selectedItem}
        extra={
          selectedItem && (
            <Space>
              {selectedItem.is_automation && selectedItem.retry?.retryable && (
                <Button type="primary" icon={<SyncOutlined />} onClick={() => handleAction([selectedItem.id], 'retry')}>立即重试</Button>
              )}
              {selectedItem.is_automation && (
                <Button onClick={() => handleAction([selectedItem.id], 'resolve')}>标记解决</Button>
              )}
              {!selectedItem.is_automation && selectedItem.action_state === 'needs_review' && (
                <Button type="primary" onClick={() => handleAction([selectedItem.id], 'approve')}>批准</Button>
              )}
            </Space>
          )
        }
      >
        {selectedItem && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="核心属性" bordered column={2} size="small">
              <Descriptions.Item label="ID" span={2}>{selectedItem.id}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>{selectedItem.title}</Descriptions.Item>
              <Descriptions.Item label="来源">{selectedItem.is_automation ? 'AUTOMATION' : 'QUEUE'}</Descriptions.Item>
              <Descriptions.Item label="风险">{selectedItem.risk}</Descriptions.Item>
            </Descriptions>

            {selectedItem.evidence && (
              <section>
                <Title level={5}>证据层 (Evidence)</Title>
                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                  {selectedItem.evidence.input_summary && <Paragraph><Text type="secondary">输入参数：</Text>{selectedItem.evidence.input_summary}</Paragraph>}
                  {selectedItem.evidence.error_excerpt && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="danger" strong>错误片段：</Text>
                      <pre style={{ background: '#fff1f0', border: '1px solid #ffa39e', padding: '8px', marginTop: 4, fontSize: 11, overflowX: 'auto' }}>
                        {selectedItem.evidence.error_excerpt}
                      </pre>
                    </div>
                  )}
                  {selectedItem.evidence.decision_context && <Paragraph><Text type="secondary">决策上下文：</Text>{selectedItem.evidence.decision_context}</Paragraph>}
                </div>
              </section>
            )}

            <Form layout="vertical">
              <Form.Item label="操作备注">
                <Input.TextArea rows={2} placeholder="添加意见..." value={actionNote} onChange={e => setActionNote(e.target.value)} />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Drawer>
    </Space>
  );
};

export default Inbox;
