import { useState } from 'react';
import { Box, Grid } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { subDays } from 'date-fns';

export interface AnalyticsFilterValues {
  startDate: Date;
  endDate: Date;
}

interface AnalyticsFiltersProps {
  onFilterChange: (filters: AnalyticsFilterValues) => void;
  initialFilters?: AnalyticsFilterValues;
}

export function AnalyticsFilters({ onFilterChange, initialFilters }: AnalyticsFiltersProps) {
  const [filters, setFilters] = useState<AnalyticsFilterValues>(
    initialFilters || {
      startDate: subDays(new Date(), 90), // Default to last 90 days
      endDate: new Date(),
    }
  );

  const handleFilterChange = (field: keyof AnalyticsFilterValues, value: any) => {
    if (value) { // Verificar se o valor não é nulo
      const newFilters = { ...filters, [field]: value };
      setFilters(newFilters);
      onFilterChange(newFilters);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Data Início"
              value={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              format="dd/MM/yyyy"
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Data Fim"
              value={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              format="dd/MM/yyyy"
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}
