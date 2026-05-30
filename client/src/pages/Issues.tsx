import React, { useEffect, useState } from 'react';
import { Table, Tag, Typography, Button, Space, Card, Row, Col, Statistic, List, message, Divider, Drawer, Descriptions, Modal, DatePicker } from 'antd';
import { WarningOutlined, ExperimentOutlined, BugOutlined, RocketOutlined, AuditOutlined, CheckCircleOutlined, ClockCircleOutlined, RollbackOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title, Paragraph } = Typography;

interface IssueRecord {
  ui_id: string;
  action_id: string;
  kind: 'review' | 'experiment' | 'feedback' | 'feedback_cause' | 'handoff';
  title: string;
  source_path: string;
  review_state: string;
  review_override: boolean;
  review_last_action: string;
  review_note: string;
  review_defer_until: string;
  review_updated_at: string;
  review_updated_by: string;
  target_url?: string;
}

interface FeedbackIncident {
  time_utc: string;
  kind: string;
  session: string;
  source: string;
  summary: string;
}

const Issues: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ records: IssueRecord[], feedback: any, summary: any }>({ 
    records: [], 
    feedback: null, 
    summary: { total_records: 0, incident_count: 0 } 
  });
  const [selectedRecord, setSelectedRecord] = useState<IssueRecord | null>(null);
  
  // Defer Modal State
  const [deferModalVisible, setDeferModalVisible] = useState(false);
  const [deferDate, setDeferDate] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/issues')
      .then(res => setData(res.data))
      .catch(() => message.error('获取问题记录失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = (actionId: string, action: string, extra: any = {}) => {
    setLoading(true);
    axios.post(`/api/ops/${encodeURIComponent(actionId)}/action`, {
      action,
      actor: '@operator',
      ...extra
    }).then(() => {
      message.success(`操作成功: ${action}`);
      setSelectedRecord(null);
      fetchData();
    }).catch((err) => {
      message.error(`操作失败: ${err.response?.data?.error || err.message}`);
      setLoading(false);
    });
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'review': return <AuditOutlined style={{ color: '#1890ff' }} />;
      case 'experiment': return <ExperimentOutlined style={{ color: '#722ed1' }} />;
      case 'feedback': return <BugOutlined style={{ color: '#f5222d' }} />;
      case 'feedback_cause': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'handoff': return <RocketOutlined style={{ color: '#52c41a' }} />;
      default: return <WarningOutlined />;
    }
  };

  const getStatusTag = (state: string) => {
    switch (state) {
      case 'done': return <Tag color="success">已处理</Tag>;
      case 'execute': return <Tag color="processing">推进中</Tag>;
      case 'defer': return <Tag color="warning">已暂缓</Tag>;
      case 'review': return <Tag color="error">需复核</Tag>;
      default: return <Tag>待判断</Tag>;
    }
  };

  const columns = [
    {
      title: '类别',
      dataIndex: 'kind',
      key: 'kind',
      render: (kind: string) => (
        <Space>
          {getKindIcon(kind)}
          <Text size="small" style={{ fontSize: 11 }}>{kind.toUpperCase()}</Text>
        </Space>
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong style={{ fontSize: 13 }}>{text}</Text>
    },
    {
      title: '状态',
      dataIndex: 'review_state',
      key: 'review_state',
      render: (state: string) => getStatusTag(state)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: IssueRecord) => (
        <Button type="link" size="small" onClick={() => setSelectedRecord(record)}>详情</Button>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={8}><Card size="small"><Statistic title="待处理记录" value={data.summary.total_records} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="异常信号" value={data.summary.incident_count} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="运行日期" value={data.feedback?.run_date || '-'} /></Card></Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="异常与记录列表" size="small">
            <Table 
              columns={columns} 
              dataSource={data.records.map(r => ({ ...r, key: r.ui_id }))} 
              loading={loading}
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="最新反馈流" size="small">
            <List
              loading={loading}
              itemLayout="vertical"
              dataSource={data.feedback?.recent_incidents || []}
              renderItem={(item: FeedbackIncident) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    title={<Text style={{ fontSize: 12 }}>{item.kind} · {new Date(item.time_utc).toLocaleTimeString()}</Text>}
                    description={<Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, marginBottom: 0 }}>{item.summary}</Paragraph>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        title="记录详情"
        width={500}
        onClose={() => setSelectedRecord(null)}
        open={!!selectedRecord}
        extra={
          selectedRecord && (
            <Space>
              {selectedRecord.review_state !== 'done' && (
                <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAction(selectedRecord.action_id, 'mark_done')}>完成</Button>
              )}
              <Button size="small" icon={<ClockCircleOutlined />} onClick={() => setDeferModalVisible(true)}>暂缓</Button>
              <Button size="small" icon={<RollbackOutlined />} onClick={() => handleAction(selectedRecord.action_id, 'restore_auto')}>重置</Button>
            </Space>
          )
        }
      >
        {selectedRecord && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" bordered column={1} size="small">
              <Descriptions.Item label="ID">{selectedRecord.ui_id}</Descriptions.Item>
              <Descriptions.Item label="类别">{selectedRecord.kind.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(selectedRecord.review_state)}</Descriptions.Item>
              <Descriptions.Item label="源文件"><Text style={{ fontSize: 11 }}>{selectedRecord.source_path}</Text></Descriptions.Item>
            </Descriptions>

            <section>
              <Title level={5}>审计信息</Title>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="操作人">{selectedRecord.review_updated_by || '-'}</Descriptions.Item>
                <Descriptions.Item label="最后操作">{selectedRecord.review_last_action || '-'}</Descriptions.Item>
                <Descriptions.Item label="备注">{selectedRecord.review_note || '无'}</Descriptions.Item>
                {selectedRecord.review_defer_until && (
                  <Descriptions.Item label="暂缓至">{new Date(selectedRecord.review_defer_until).toLocaleString()}</Descriptions.Item>
                )}
              </Descriptions>
            </section>
            
            {selectedRecord.target_url && (
              <Button type="primary" ghost block icon={<RocketOutlined />} onClick={() => window.open(selectedRecord.target_url, '_blank')}>
                跳转到原始目标
              </Button>
            )}
          </Space>
        )}
      </Drawer>

      <Modal
        title="设置暂缓"
        open={deferModalVisible}
        onOk={() => {
          if (!deferDate || !selectedRecord) return;
          handleAction(selectedRecord.action_id, 'mark_defer', { defer_until_utc: deferDate });
          setDeferModalVisible(false);
        }}
        onCancel={() => setDeferModalVisible(false)}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>请选择恢复处理的日期：</div>
        <DatePicker style={{ width: '100%' }} showTime onChange={(date) => setDeferDate(date ? date.toISOString() : null)} />
      </Modal>
    </Space>
  );
};

export default Issues;
