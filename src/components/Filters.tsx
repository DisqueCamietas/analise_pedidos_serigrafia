import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { subDays } from 'date-fns';

interface FiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  startDate: Date;
  endDate: Date;
  fornecedor: string;
  status: 'finalizado' | 'aberto' | 'cancelado';
  numeroPedido: string;
}

export function Filters({ onFilterChange }: FiltersProps) {
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    fornecedor: 'Todos',
    status: 'finalizado',
    numeroPedido: ''
  });

  useEffect(() => {
    const fetchFornecedores = async () => {
      const fornecedoresRef = ref(database, 'fornecedores');
      const snapshot = await get(fornecedoresRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const nomes = Object.values(data).map((f: any) => f.nome);
        setFornecedores(['Todos', ...nomes]);
      }
    };

    fetchFornecedores();
  }, []);

  const handleFilterChange = (field: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Data Início"
              value={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              format="dd/MM/yyyy"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Data Fim"
              value={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              format="dd/MM/yyyy"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Fornecedor</InputLabel>
              <Select
                value={filters.fornecedor}
                label="Fornecedor"
                onChange={(e) => handleFilterChange('fornecedor', e.target.value)}
              >
                {fornecedores.map((fornecedor) => (
                  <MenuItem key={fornecedor} value={fornecedor}>
                    {fornecedor}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Número do Pedido"
              value={filters.numeroPedido}
              onChange={(e) => handleFilterChange('numeroPedido', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl>
              <RadioGroup
                row
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <FormControlLabel
                  value="finalizado"
                  control={<Radio />}
                  label="Finalizado"
                />
                <FormControlLabel
                  value="aberto"
                  control={<Radio />}
                  label="Aberto"
                />
                <FormControlLabel
                  value="cancelado"
                  control={<Radio />}
                  label="Cancelado"
                />
              </RadioGroup>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}
