import { useTranslation } from 'react-i18next';
import { Box, Button, MenuItem, TextField } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <TextField
      select
      size="small"
      value={i18n.language}
      onChange={handleLanguageChange}
      InputProps={{
        startAdornment: <TranslateIcon sx={{ mr: 1, fontSize: 18 }} />
      }}
      sx={{ minWidth: 100 }}
    >
      <MenuItem value="en">English</MenuItem>
      <MenuItem value="it">Italiano</MenuItem>
    </TextField>
  );
}
