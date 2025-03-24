import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Box, 
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { FinancialAnalysis } from '../components/analytics/FinancialAnalysis';
import { SupplierAnalysis } from '../components/analytics/SupplierAnalysis';
import { TimeAnalysis } from '../components/analytics/TimeAnalysis';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`,
  };
}

export function Analytics() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNavigateToDashboard = () => {
    navigate('/');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Analytics - Análise de Pedidos
          </Typography>
          <Button color="inherit" onClick={handleNavigateToDashboard} sx={{ mr: 2 }}>
            Dashboard
          </Button>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {currentUser?.email}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper elevation={3}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
              <Tab label="Dashboard" {...a11yProps(0)} />
              <Tab label="Análise Financeira" {...a11yProps(1)} />
              <Tab label="Análise de Fornecedores" {...a11yProps(2)} />
              <Tab label="Análise Temporal" {...a11yProps(3)} />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <AnalyticsDashboard />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <FinancialAnalysis />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <SupplierAnalysis />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <TimeAnalysis />
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}
