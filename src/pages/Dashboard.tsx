import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Filters, FilterValues } from '../components/Filters';
import { Report } from '../components/Report';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Paper
} from '@mui/material';
import { subDays } from 'date-fns';
import PaymentIcon from '@mui/icons-material/Payment';
import BarChartIcon from '@mui/icons-material/BarChart';

export function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterValues>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    fornecedor: 'Todos',
    status: 'finalizado',
    numeroPedido: ''
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleNavigateToCheckout = () => {
    navigate('/fechamento-fornecedor');
  };

  const handleNavigateToAnalytics = () => {
    navigate('/analytics');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Análise de pedidos personalizados
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<BarChartIcon />}
            onClick={handleNavigateToAnalytics}
            sx={{ mr: 2 }}
          >
            Analytics
          </Button>
          <Button 
            color="inherit" 
            startIcon={<PaymentIcon />}
            onClick={handleNavigateToCheckout}
            sx={{ mr: 2 }}
          >
            Fechamento de Fornecedor
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
          <Filters onFilterChange={handleFilterChange} />
        </Paper>
        
        <Box sx={{ mt: 4 }}>
          <Report filters={filters} />
        </Box>
      </Container>
    </Box>
  );
}
