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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent
} from '@mui/material';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function FinancialAnalysis() {
  const [dateFilters, setDateFilters] = useState<AnalyticsFilterValues | undefined>();
  const { loading, error, pedidos, periodoAnalytics, kpis } = useAnalyticsData(dateFilters);
  const [sortField, setSortField] = useState<string>('resultadoPercentual');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleFilterChange = (filters: AnalyticsFilterValues) => {
    setDateFilters(filters);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Ordenar pedidos
  const sortedPedidos = [...pedidos].sort((a, b) => {
    const fieldA = a[sortField as keyof typeof a];
    const fieldB = b[sortField as keyof typeof b];
    
    if (typeof fieldA === 'number' && typeof fieldB === 'number') {
      return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
    }
    
    return 0;
  });

  // Dados para o gráfico de evolução de margem
  const margemData = {
    labels: periodoAnalytics.map(p => p.periodo),
    datasets: [
      {
        label: 'Margem Média (%)',
        data: periodoAnalytics.map(p => p.resultadoPercentual),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  // Dados para o gráfico de comparação valor x custo
  const valorCustoData = {
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
        label: 'Custo Total (R$)',
        data: periodoAnalytics.map(p => p.custoTotal),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Opções para os gráficos
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2) + '%';
  };

  const handleSortChange = (field: string) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Filtros de data */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <AnalyticsFilters onFilterChange={handleFilterChange} />
      </Paper>
      
      {/* KPIs Financeiros */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resultado Bruto
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatCurrency(kpis.resultadoBruto)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Maior Margem
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatPercent(kpis.maiorMargem)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Menor Margem
              </Typography>
              <Typography variant="h4" color={kpis.menorMargem < 30 ? "error.main" : "warning.main"}>
                {formatPercent(kpis.menorMargem)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Evolução da Margem Média
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Line options={chartOptions} data={margemData} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Valor vs. Custo por Período
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Bar options={chartOptions} data={valorCustoData} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabela de Pedidos */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Análise Detalhada de Pedidos
          </Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={sortField}
              label="Ordenar por"
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <MenuItem value="valor">Valor</MenuItem>
              <MenuItem value="custo">Custo</MenuItem>
              <MenuItem value="resultadoBruto">Resultado Bruto</MenuItem>
              <MenuItem value="resultadoPercentual">Margem (%)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nº Pedido</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell align="right">Valor (R$)</TableCell>
                <TableCell align="right">Custo (R$)</TableCell>
                <TableCell align="right">Resultado (R$)</TableCell>
                <TableCell align="right">Margem (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.id}</TableCell>
                  <TableCell>{new Date(pedido.dataEnvio).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{pedido.fornecedor}</TableCell>
                  <TableCell align="right">{formatCurrency(pedido.valor)}</TableCell>
                  <TableCell align="right">{formatCurrency(pedido.custo)}</TableCell>
                  <TableCell align="right">{formatCurrency(pedido.resultadoBruto)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: pedido.resultadoPercentual < 30 
                        ? 'error.main' 
                        : pedido.resultadoPercentual < 50 
                          ? 'warning.main' 
                          : 'success.main'
                    }}
                  >
                    {formatPercent(pedido.resultadoPercentual)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
