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
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function TimeAnalysis() {
  const [dateFilters, setDateFilters] = useState<AnalyticsFilterValues | undefined>();
  const { loading, error, periodoAnalytics } = useAnalyticsData(dateFilters);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [dataType, setDataType] = useState<'valor' | 'margem' | 'resultado'>('valor');

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

  // Dados para o gráfico de evolução temporal
  const getChartData = () => {
    const labels = periodoAnalytics.map(p => p.periodo);
    
    if (dataType === 'valor') {
      return {
        labels,
        datasets: [
          {
            label: 'Valor Total (R$)',
            data: periodoAnalytics.map(p => p.valorTotal),
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1,
            fill: true,
          },
          {
            label: 'Custo Total (R$)',
            data: periodoAnalytics.map(p => p.custoTotal),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1,
            fill: true,
          },
        ],
      };
    } else if (dataType === 'margem') {
      return {
        labels,
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
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'Resultado Bruto (R$)',
            data: periodoAnalytics.map(p => p.resultadoBruto),
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.1,
            fill: true,
          },
        ],
      };
    }
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
    scales: {
      y: {
        beginAtZero: true,
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

  // Calcular tendências
  const calcularTendencia = () => {
    if (periodoAnalytics.length < 2) return 'Dados insuficientes';
    
    const ultimosPeriodos = periodoAnalytics.slice(-3);
    
    if (dataType === 'valor') {
      const valorInicial = ultimosPeriodos[0].valorTotal;
      const valorFinal = ultimosPeriodos[ultimosPeriodos.length - 1].valorTotal;
      const variacao = ((valorFinal - valorInicial) / valorInicial) * 100;
      
      if (variacao > 10) return 'Em forte alta';
      if (variacao > 0) return 'Em alta';
      if (variacao < -10) return 'Em forte queda';
      if (variacao < 0) return 'Em queda';
      return 'Estável';
    } else if (dataType === 'margem') {
      const margemInicial = ultimosPeriodos[0].resultadoPercentual;
      const margemFinal = ultimosPeriodos[ultimosPeriodos.length - 1].resultadoPercentual;
      const variacao = margemFinal - margemInicial;
      
      if (variacao > 5) return 'Em forte alta';
      if (variacao > 0) return 'Em alta';
      if (variacao < -5) return 'Em forte queda';
      if (variacao < 0) return 'Em queda';
      return 'Estável';
    } else {
      const resultadoInicial = ultimosPeriodos[0].resultadoBruto;
      const resultadoFinal = ultimosPeriodos[ultimosPeriodos.length - 1].resultadoBruto;
      const variacao = ((resultadoFinal - resultadoInicial) / resultadoInicial) * 100;
      
      if (variacao > 10) return 'Em forte alta';
      if (variacao > 0) return 'Em alta';
      if (variacao < -10) return 'Em forte queda';
      if (variacao < 0) return 'Em queda';
      return 'Estável';
    }
  };

  const tendencia = calcularTendencia();
  const tendenciaColor = 
    tendencia === 'Em forte alta' || tendencia === 'Em alta' 
      ? 'success.main' 
      : tendencia === 'Em forte queda' || tendencia === 'Em queda'
        ? 'error.main'
        : 'text.primary';

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Filtros de data */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <AnalyticsFilters onFilterChange={handleFilterChange} />
      </Paper>
      
      {/* Controles */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Dados</InputLabel>
              <Select
                value={dataType}
                label="Tipo de Dados"
                onChange={(e) => setDataType(e.target.value as 'valor' | 'margem' | 'resultado')}
              >
                <MenuItem value="valor">Valor e Custo</MenuItem>
                <MenuItem value="margem">Margem</MenuItem>
                <MenuItem value="resultado">Resultado Bruto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Gráfico</InputLabel>
              <Select
                value={chartType}
                label="Tipo de Gráfico"
                onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
              >
                <MenuItem value="line">Linha</MenuItem>
                <MenuItem value="bar">Barra</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Períodos Analisados
              </Typography>
              <Typography variant="h4" color="primary">
                {periodoAnalytics.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Último Período
              </Typography>
              <Typography variant="h4" color="primary">
                {periodoAnalytics.length > 0 ? periodoAnalytics[periodoAnalytics.length - 1].periodo : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendência
              </Typography>
              <Typography variant="h4" color={tendenciaColor}>
                {tendencia}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {dataType === 'valor' ? 'Valor Último Período' : 
                 dataType === 'margem' ? 'Margem Último Período' : 
                 'Resultado Último Período'}
              </Typography>
              <Typography variant="h4" color="primary">
                {periodoAnalytics.length > 0 ? 
                  dataType === 'valor' 
                    ? formatCurrency(periodoAnalytics[periodoAnalytics.length - 1].valorTotal)
                    : dataType === 'margem'
                      ? formatPercent(periodoAnalytics[periodoAnalytics.length - 1].resultadoPercentual)
                      : formatCurrency(periodoAnalytics[periodoAnalytics.length - 1].resultadoBruto)
                  : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfico */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Evolução Temporal - {
            dataType === 'valor' ? 'Valor e Custo' : 
            dataType === 'margem' ? 'Margem' : 
            'Resultado Bruto'
          }
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ height: 400 }}>
          {chartType === 'line' ? (
            <Line options={chartOptions} data={getChartData()} />
          ) : (
            <Bar options={chartOptions} data={getChartData()} />
          )}
        </Box>
      </Paper>

      {/* Tabela de Períodos */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Análise Detalhada por Período
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Período</TableCell>
                <TableCell align="center">Pedidos</TableCell>
                <TableCell align="right">Valor Total (R$)</TableCell>
                <TableCell align="right">Custo Total (R$)</TableCell>
                <TableCell align="right">Resultado (R$)</TableCell>
                <TableCell align="right">Margem (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periodoAnalytics.map((periodo) => (
                <TableRow key={periodo.periodo}>
                  <TableCell>{periodo.periodo}</TableCell>
                  <TableCell align="center">{periodo.pedidos}</TableCell>
                  <TableCell align="right">{formatCurrency(periodo.valorTotal)}</TableCell>
                  <TableCell align="right">{formatCurrency(periodo.custoTotal)}</TableCell>
                  <TableCell align="right">{formatCurrency(periodo.resultadoBruto)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: periodo.resultadoPercentual < 30 
                        ? 'error.main' 
                        : periodo.resultadoPercentual < 50 
                          ? 'warning.main' 
                          : 'success.main'
                    }}
                  >
                    {formatPercent(periodo.resultadoPercentual)}
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
