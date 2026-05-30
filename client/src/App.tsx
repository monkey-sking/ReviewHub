import React, { useState } from 'react';
import { Layout, Menu, Typography, ConfigProvider, theme } from 'antd';
import {
  DashboardOutlined,
  InboxOutlined,
  AlertOutlined,
  ProjectOutlined,
  HistoryOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import Workboard from './pages/Workboard';
import Inbox from './pages/Inbox';
import Issues from './pages/Issues';
import Projects from './pages/Projects';
import Activity from './pages/Activity';
import Recap from './pages/Recap';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('recap');
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const renderContent = () => {
    switch (selectedKey) {
      case 'recap':
        return <Recap />;
      case 'workboard':
        return <Workboard />;
      case 'inbox':
        return <Inbox />;
      case 'issues':
        return <Issues />;
      case 'projects':
        return <Projects />;
      case 'activity':
        return <Activity />;
      default:
        return <div style={{ padding: 24 }}>功能建设中...</div>;
    }
  };

  const getPageTitle = (key: string) => {
    const titles: any = {
      recap: '每日复盘 (Recap)',
      workboard: '工作看板 (Workboard)',
      inbox: '执行收件箱 (Inbox)',
      issues: '问题记录 (Issues)',
      projects: '项目工作台 (Projects)',
      activity: '活动流 (Activity)'
    };
    return titles[key] || 'ReviewHub';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" borderRight="1px solid #f0f0f0" breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: '16px 24px' }}>
          <Title level={4} style={{ margin: 0, color: '#1677ff' }}>ReviewHub</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onSelect={({ key }) => setSelectedKey(key)}
          items={[
            { key: 'recap', icon: <FileSearchOutlined />, label: '每日复盘' },
            { key: 'workboard', icon: <DashboardOutlined />, label: '工作看板' },
            { key: 'inbox', icon: <InboxOutlined />, label: '执行收件箱' },
            { key: 'issues', icon: <AlertOutlined />, label: '问题记录' },
            { key: 'projects', icon: <ProjectOutlined />, label: '项目工作台' },
            { key: 'activity', icon: <HistoryOutlined />, label: '活动流' },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {getPageTitle(selectedKey)}
          </Typography.Text>
        </Header>
        <Content style={{ margin: '0', background: colorBgContainer, overflowY: 'auto' }}>
          <div style={{ padding: 24 }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
