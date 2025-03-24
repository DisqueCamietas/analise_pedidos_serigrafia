import { useState } from 'react';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { AnalyticsFilters, AnalyticsFilterValues } from './AnalyticsFilters';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { subDays } from 'date-fns';

// Registrar componentes do Chart.js
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

export function AnalyticsDashboard() {
  // Estado para os filtros de data
  const [dateFilters, setDateFilters] = useState<AnalyticsFilterValues>({
    startDate: subDays(new Date(), 90),
    endDate: new Date(),
  });

  // Handler para mudanças nos filtros
  const handleFilterChange = (filters: AnalyticsFilterValues) => {
    setDateFilters(filters);
  };

  // Buscar dados de análise
  const { loading, error, fornecedoresAnalytics, periodoAnalytics, kpis } = useAnalyticsData(dateFilters);

  // Formatadores
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2) + '%';
  };

  // Dados para o gráfico de distribuição por fornecedor
  const fornecedoresData = {
    labels: fornecedoresAnalytics.map(f => f.nome),
    datasets: [
      {
        label: 'Valor Total (R$)',
        data: fornecedoresAnalytics.map(f => f.valorTotal),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Dados para o gráfico de margens por fornecedor
  const margensData = {
    labels: fornecedoresAnalytics.map(f => f.nome),
    datasets: [
      {
        label: 'Margem Média (%)',
        data: fornecedoresAnalytics.map(f => f.resultadoPercentual),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Dados para o gráfico de evolução temporal
  const periodoData = {
    labels: periodoAnalytics.map(p => p.periodo),
    datasets: [
      {
        label: 'Valor Total (R$)',
        data: periodoAnalytics.map(p => p.valorTotal),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Resultado Bruto (R$)',
        data: periodoAnalytics.map(p => p.resultadoBruto),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Opções para os gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  // Renderização do componente
  if (loading) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Paper elevation={1} sx={{ mb: 3 }}>
          <AnalyticsFilters onFilterChange={handleFilterChange} />
        </Paper>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Paper elevation={1} sx={{ mb: 3 }}>
          <AnalyticsFilters onFilterChange={handleFilterChange} />
        </Paper>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (fornecedoresAnalytics.length === 0 || periodoAnalytics.length === 0) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Paper elevation={1} sx={{ mb: 3 }}>
          <AnalyticsFilters onFilterChange={handleFilterChange} />
        </Paper>
        <Alert severity="info">
          Não há dados para exibir no período selecionado. Tente ajustar o filtro de datas.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Filtros de data */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <AnalyticsFilters onFilterChange={handleFilterChange} />
      </Paper>
      
      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ticket Médio
              </Typography>
              <Typography variant="h4" color="primary">
                {formatCurrency(kpis.ticketMedio)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Margem Média
              </Typography>
              <Typography variant="h4" color="primary">
                {formatPercent(kpis.margemMedia)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total de Pedidos
              </Typography>
              <Typography variant="h4" color="primary">
                {kpis.totalPedidos}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Valor Total
              </Typography>
              <Typography variant="h4" color="primary">
                {formatCurrency(kpis.valorTotal)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Distribuição de Valor por Fornecedor
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Pie data={fornecedoresData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Margens por Fornecedor
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Bar data={margensData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Evolução Mensal
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Bar data={periodoData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
