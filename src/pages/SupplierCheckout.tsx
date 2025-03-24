import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Box, 
  Container, 
  Paper, 
  Tabs, 
  Tab, 
  Typography, 
  AppBar, 
  Toolbar, 
  Button 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { NewCheckout } from '../components/NewCheckout';
import { CheckoutHistory } from '../components/CheckoutHistory';

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
      id={`checkout-tabpanel-${index}`}
      aria-labelledby={`checkout-tab-${index}`}
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
    id: `checkout-tab-${index}`,
    'aria-controls': `checkout-tabpanel-${index}`,
  };
}

export function SupplierCheckout() {
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
            Fechamento de Fornecedor
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
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="checkout tabs">
              <Tab label="Novo Fechamento" {...a11yProps(0)} />
              <Tab label="Histórico de Fechamentos" {...a11yProps(1)} />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <NewCheckout />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <CheckoutHistory />
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}
