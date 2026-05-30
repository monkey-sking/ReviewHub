import React, { useEffect, useState } from 'react';
import { Timeline, Tag, Typography, Space, Card, Row, Col, Statistic, message, Badge, Segmented, Empty, Spin, Button } from 'antd';
import { HistoryOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined, CommentOutlined, FilterOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title, Paragraph } = Typography;

interface Signal {
  id: string;
  signal_kind: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp_utc: string;
  title: string;
  summary: string;
  note: string;
}

const Activity: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/activity')
      .then(res => {
        console.log('Activity Data:', res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error('Activity Error:', err);
        message.error('获取活动记录失败');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getSignalIcon = (kind: string, severity: string) => {
    if (severity === 'critical') return <WarningOutlined style={{ color: '#f5222d' }} />;
    const k = String(kind || '').toLowerCase();
    if (k.includes('queue')) return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (k.includes('thread')) return <CommentOutlined style={{ color: '#1890ff' }} />;
    if (k.includes('ops')) return <HistoryOutlined style={{ color: '#722ed1' }} />;
    return <InfoCircleOutlined style={{ color: '#8c8c8c' }} />;
  };

  const entries = Array.isArray(data?.entries) ? data.entries : [];

  const filteredEntries = entries.filter((e: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return e.severity === 'critical';
    if (filter === 'ACTIONS') return String(e.signal_kind || '').includes('action');
    if (filter === 'INCIDENTS') return String(e.signal_kind || '').includes('incident');
    return true;
  });

  if (loading && !data) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="正在加载活动流..." /></div>;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="信号总数" value={data?.total_entries || 0} prefix={<HistoryOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待处理信号" value={filteredEntries.length} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      <Card 
        size="small"
        title={
          <Space>
            <FilterOutlined />
            <Text strong>活动流</Text>
            <Segmented 
              size="small"
              options={[
                { label: '全部', value: 'ALL' },
                { label: '严重异常', value: 'CRITICAL' },
                { label: '人工处理', value: 'ACTIONS' }
              ]} 
              value={filter}
              onChange={(val) => setFilter(val as string)}
            />
          </Space>
        }
        extra={<Button size="small" type="link" onClick={fetchData}>刷新</Button>}
      >
        <div style={{ padding: '24px 12px' }}>
          {filteredEntries.length > 0 ? (
            <Timeline
              items={filteredEntries.map((signal: any) => ({
                dot: getSignalIcon(signal.signal_kind, signal.severity),
                color: getSeverityColor(signal.severity),
                children: (
                  <div style={{ marginBottom: 20 }}>
                    <Space style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {signal.timestamp_utc ? new Date(signal.timestamp_utc).toLocaleString() : '未知时间'}
                      </Text>
                      <Tag color={getSeverityColor(signal.severity || 'info')} size="small" bordered={false} style={{ fontSize: 10 }}>
                        {String(signal.signal_kind || 'SIGNAL').replace('_', ' ').toUpperCase()}
                      </Tag>
                    </Space>
                    <div>
                      <Text strong style={{ fontSize: 14 }}>{signal.title || '系统信号'}</Text>
                      {signal.summary && <Text type="secondary" style={{ marginLeft: 8 }}> · {signal.summary}</Text>}
                    </div>
                    {signal.note && (
                      <div style={{ marginTop: 6, background: '#f9f9f9', padding: '6px 10px', borderRadius: '4px', borderLeft: '3px solid #eee' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.note}</Text>
                      </div>
                    )}
                  </div>
                )
              }))}
            />
          ) : (
            <Empty description={data ? "没有匹配的活动记录" : "暂无数据"} />
          )}
        </div>
      </Card>
    </Space>
  );
};

export default Activity;
