import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Badge, Tag, Typography, Spin, Empty, Divider, Space, Drawer, Button, Descriptions, Tooltip, message } from 'antd';
import { ClockCircleOutlined, DeploymentUnitOutlined, WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, RocketOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title, Paragraph } = Typography;

interface WorkboardEntry {
  id: string;
  source_kind: 'queue' | 'thread' | 'review';
  title: string;
  platform: string;
  project: string;
  lane_status: string;
  priority: 'high' | 'medium' | 'low';
  priority_rank: number;
  summary: string;
  note: string;
  preview: string;
  target_url?: string;
  navigation: {
    kind: string;
    target_id: string;
    section: string;
  };
}

const Workboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ entries: WorkboardEntry[] }>({ entries: [] });
  const [selectedItem, setSelectedItem] = useState<WorkboardEntry | null>(null);

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/workboard')
      .then(res => setData(res.data))
      .catch(() => message.error('获取看板数据失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickAction = (item: WorkboardEntry, action: string) => {
    const apiPath = item.source_kind === 'queue' ? `/api/queue/${item.navigation.target_id}/action` :
                    item.source_kind === 'thread' ? `/api/thread/${item.navigation.target_id}/action` :
                    `/api/ops/${item.navigation.target_id}/action`;
    
    setLoading(true);
    axios.post(apiPath, { action, actor: '@operator' })
      .then(() => {
        message.success('操作成功');
        setSelectedItem(null);
        fetchData();
      })
      .catch(err => {
        message.error(`操作失败: ${err.response?.data?.error || err.message}`);
        setLoading(false);
      });
  };

  const lanes = [
    { id: 'decision', title: '决策中', filter: (e: WorkboardEntry) => e.state === 'pending_approval' || e.state === 'new' },
    { id: 'moving', title: '可推进', filter: (e: WorkboardEntry) => e.state === 'ready' || e.state === 'running' },
    { id: 'blocked', title: '阻塞中', filter: (e: WorkboardEntry) => e.state === 'blocked' || e.state === 'waiting_support' },
    { id: 'watching', title: '观察中', filter: (e: WorkboardEntry) => e.state === 'resolved' || e.state === 'done' || e.state === 'ignored' }
  ];

  const getSourceTag = (kind: string) => {
    switch (kind) {
      case 'queue': return <Tag color="blue" bordered={false}>QUEUE</Tag>;
      case 'thread': return <Tag color="purple" bordered={false}>THREAD</Tag>;
      case 'review': return <Tag color="orange" bordered={false}>REVIEW</Tag>;
      default: return <Tag>{kind.toUpperCase()}</Tag>;
    }
  };

  return (
    <div style={{ minHeight: '80vh' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        {lanes.map(lane => (
          <Col span={6} key={lane.id}>
            <div style={{ background: '#f0f2f5', padding: '12px', borderRadius: '8px', minHeight: '70vh' }}>
              <Title level={5} style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                {lane.title}
                <Badge count={data.entries.filter(lane.filter).length} style={{ marginLeft: 8, backgroundColor: '#d9d9d9' }} />
              </Title>
              
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {loading && data.entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>
                ) : data.entries.filter(lane.filter).map(entry => (
                  <Card 
                    key={entry.id} 
                    size="small" 
                    hoverable 
                    onClick={() => setSelectedItem(entry)}
                    bodyStyle={{ padding: '12px' }}
                    style={{ borderRadius: '6px', border: entry.priority === 'high' ? '1px solid #ffa39e' : 'none' }}
                  >
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Space>
                        {getSourceTag(entry.source_kind)}
                        <Tag color="default" style={{ fontSize: '10px', borderRadius: '4px' }}>
                          {entry.state.toUpperCase()}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '11px' }}>{entry.project}</Text>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: 8 }}>{entry.title}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>{entry.summary}</div>
                    {entry.note && (
                      <div style={{ fontSize: '11px', color: '#fa8c16', background: '#fffbe6', padding: '4px 8px', borderRadius: '4px' }}>
                        {entry.note}
                      </div>
                    )}
                  </Card>
                ))}
                {!loading && data.entries.filter(lane.filter).length === 0 && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无事项" />
                )}
              </Space>
            </div>
          </Col>
        ))}
      </Row>

      <Drawer
        title="任务上下文详情"
        width={550}
        onClose={() => setSelectedItem(null)}
        open={!!selectedItem}
        extra={
          selectedItem && (
            <Space>
              {selectedItem.source_kind === 'queue' && selectedItem.lane_status === 'needs_review' && (
                <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleQuickAction(selectedItem, 'approve')}>批准</Button>
              )}
              {selectedItem.source_kind === 'review' && (
                <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleQuickAction(selectedItem, 'mark_done')}>标记完成</Button>
              )}
              <Button size="small" onClick={() => setSelectedItem(null)}>关闭</Button>
            </Space>
          )
        }
      >
        {selectedItem && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本属性" bordered column={1} size="small">
              <Descriptions.Item label="来源">{getSourceTag(selectedItem.source_kind)}</Descriptions.Item>
              <Descriptions.Item label="项目">{selectedItem.project || '未分配'}</Descriptions.Item>
              <Descriptions.Item label="平台">{selectedItem.platform || '-'}</Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={selectedItem.priority === 'high' ? 'red' : 'blue'}>{selectedItem.priority.toUpperCase()}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <section>
              <Title level={5}><InfoCircleOutlined /> 业务摘要</Title>
              <Paragraph style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px' }}>
                {selectedItem.summary}
              </Paragraph>
              {selectedItem.note && (
                <div style={{ padding: '8px 12px', borderLeft: '4px solid #faad14', background: '#fffbe6' }}>
                  <Text type="warning" strong>当前备注: </Text>
                  <Text>{selectedItem.note}</Text>
                </div>
              )}
            </section>

            {selectedItem.preview && (
              <section>
                <Title level={5}><DeploymentUnitOutlined /> 源码/上下文预览</Title>
                <pre style={{ padding: '12px', background: '#001529', color: '#eee', borderRadius: '4px', fontSize: 11, overflowX: 'auto', maxHeight: '300px' }}>
                  {selectedItem.preview}
                </pre>
              </section>
            )}

            {selectedItem.target_url && (
              <Button type="primary" ghost block icon={<RocketOutlined />} onClick={() => window.open(selectedItem.target_url, '_blank')}>
                跳转至原始目标
              </Button>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default Workboard;
