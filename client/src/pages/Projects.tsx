import React, { useEffect, useState } from 'react';
import { Tabs, Tag, Typography, Button, Space, Card, Row, Col, Statistic, List, message, Select, Divider, Table, Modal, Form, Input, Descriptions, Badge } from 'antd';
import { ProjectOutlined, FileTextOutlined, RocketOutlined, ToolOutlined, CheckCircleOutlined, ClockCircleOutlined, PauseCircleOutlined, EditOutlined, ArrowRightOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

interface ProjectBrief {
  project: string;
  total_tasks: number;
  total_queue_items: number;
  section_counts: Record<string, number>;
  focus_cards: any[];
}

interface ProjectDetail extends ProjectBrief {
  tasks_by_section: {
    id: string;
    title: string;
    items: any[];
  }[];
  materials: any[];
}

const Projects: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectBrief[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);

  // Edit/Move Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchProjects = () => {
    setLoading(true);
    axios.get('/api/projects')
      .then(res => {
        setProjects(res.data.projects);
        if (res.data.projects.length > 0 && !selectedProject) {
          setSelectedProject(res.data.projects[0].project);
        }
      })
      .catch(() => message.error('获取项目列表失败'))
      .finally(() => setLoading(false));
  };

  const fetchDetail = (id: string) => {
    setLoading(true);
    axios.get(`/api/projects/${id}`)
      .then(res => setDetail(res.data))
      .catch(() => message.error('获取项目详情失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchDetail(selectedProject);
    }
  }, [selectedProject]);

  const handleAction = (taskId: string, action: string, payload: any) => {
    setLoading(true);
    axios.post(`/api/project-board/${encodeURIComponent(taskId)}/action`, {
      action,
      ...payload
    }).then(() => {
      message.success('操作成功');
      setEditModalVisible(false);
      if (selectedProject) fetchDetail(selectedProject);
    }).catch(err => {
      message.error(`操作失败: ${err.response?.data?.error || err.message}`);
      setLoading(false);
    });
  };

  const showEditModal = (task: any) => {
    setSelectedTask(task);
    form.setFieldsValue(task);
    setEditModalVisible(true);
  };

  const getSectionIcon = (id: string) => {
    switch (id) {
      case 'inbox': return <FileTextOutlined />;
      case 'ready': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'running': return <RocketOutlined style={{ color: '#1890ff' }} />;
      case 'waiting': return <PauseCircleOutlined style={{ color: '#faad14' }} />;
      case 'done': return <CheckCircleOutlined style={{ color: '#bfbfbf' }} />;
      default: return <ToolOutlined />;
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small" bodyStyle={{ padding: '12px 24px' }}>
        <Space size="large">
          <Text strong>项目:</Text>
          <Select style={{ width: 180 }} value={selectedProject} onChange={val => setSelectedProject(val)} loading={loading}>
            {projects.map(p => <Option key={p.project} value={p.project}>{p.project}</Option>)}
          </Select>
          {detail && <Text type="secondary">{detail.total_tasks} 任务 · {detail.materials?.length || 0} 资料</Text>}
        </Space>
      </Card>

      {detail && (
        <Tabs
          defaultActiveKey="tasks"
          items={[
            {
              key: 'tasks',
              label: <span><RocketOutlined /> 推进层 (Tasks)</span>,
              children: (
                <Row gutter={12}>
                  {detail.tasks_by_section.map(section => (
                    <Col span={4.8} key={section.id} style={{ width: '20%' }}>
                      <Card 
                        title={<Space size={4}>{getSectionIcon(section.id)}<span style={{ fontSize: 12 }}>{section.title}</span><Badge count={section.items.length} color="#eee" style={{ color: '#999', boxShadow: 'none' }} /></Space>}
                        size="small"
                        bodyStyle={{ padding: 6, minHeight: 400, background: '#fafafa' }}
                      >
                        {section.items.map((item: any) => (
                          <Card 
                            key={item.id} 
                            size="small" 
                            style={{ marginBottom: 6, borderRadius: 4, cursor: 'pointer' }}
                            bodyStyle={{ padding: 8 }}
                            hoverable
                            onClick={() => showEditModal(item)}
                          >
                            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{item.task}</div>
                            {item.next_step && <div style={{ fontSize: 10, color: '#1890ff' }}>Next: {item.next_step}</div>}
                            {item.blocker && <div style={{ fontSize: 10, color: '#f5222d' }}>Block: {item.blocker}</div>}
                          </Card>
                        ))}
                      </Card>
                    </Col>
                  ))}
                </Row>
              )
            },
            {
              key: 'materials',
              label: <span><FileTextOutlined /> 资料层 (Materials)</span>,
              children: (
                <Card size="small">
                  <Table 
                    size="small"
                    dataSource={detail.materials?.map(m => ({ ...m, key: m.id }))}
                    pagination={false}
                    columns={[
                      { title: '名称', dataIndex: 'label', key: 'label' },
                      { title: '类型', dataIndex: 'kind', key: 'kind', render: (k) => <Tag size="small">{k}</Tag> },
                      { title: '操作', key: 'action', render: (_, r) => r.reference?.startsWith('http') && <Button type="link" size="small" onClick={() => window.open(r.reference, '_blank')}>访问</Button> }
                    ]}
                  />
                </Card>
              )
            }
          ]}
        />
      )}

      <Modal
        title="任务详情与操作"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <Form form={form} layout="vertical" onFinish={(values) => handleAction(selectedTask.id, 'update', { fields: values })}>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务" span={2}>{selectedTask.task}</Descriptions.Item>
              <Descriptions.Item label="当前阶段">{selectedTask.section_title}</Descriptions.Item>
              <Descriptions.Item label="阶段 ID">{selectedTask.section_id}</Descriptions.Item>
            </Descriptions>

            <Form.Item label="阶段转移 (Move to)">
              <Space wrap>
                {['inbox', 'ready', 'running', 'waiting', 'done']
                  .filter(s => s !== selectedTask.section_id)
                  .map(s => (
                    <Button key={s} size="small" icon={<ArrowRightOutlined />} onClick={() => handleAction(selectedTask.id, 'move', { section_id: s })}>
                      {s.toUpperCase()}
                    </Button>
                  ))}
              </Space>
            </Form.Item>

            <Divider orientation="left" plain>编辑字段 (Update)</Divider>
            
            <Row gutter={12}>
              <Col span={12}><Form.Item name="next_step" label="Next Step"><Input size="small" /></Form.Item></Col>
              <Col span={12}><Form.Item name="current_step" label="Current Step"><Input size="small" /></Form.Item></Col>
              <Col span={12}><Form.Item name="blocker" label="Blocker"><Input size="small" /></Form.Item></Col>
              <Col span={12}><Form.Item name="output" label="Output"><Input size="small" /></Form.Item></Col>
            </Row>
            
            <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="canonical_link" label="Link"><Input size="small" /></Form.Item>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" icon={<EditOutlined />}>更新字段</Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Space>
  );
};

export default Projects;
