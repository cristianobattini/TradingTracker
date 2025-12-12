import type { ButtonBaseProps } from '@mui/material/ButtonBase';

import { useState, useCallback, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import ButtonBase from '@mui/material/ButtonBase';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { readUsersMeApiUsersMeGet, UserResponse } from 'src/client';

// ----------------------------------------------------------------------

export type WorkspacesPopoverProps = ButtonBaseProps & {
  data?: {
    id: string;
    name: string;
    logo: string;
    plan: string;
  }[];
};

export function UserCard({ sx, ...other }: WorkspacesPopoverProps) {
  const [user, setUser] = useState<UserResponse>();

  useEffect(() => {
    readUsersMeApiUsersMeGet().then((response) => {
      setUser(response.data);
    });
  }, []);

  const renderAvatar = (alt: string, src: string) => (
    <Box component="img" alt={alt} src={src} sx={{ width: 24, height: 24, borderRadius: '50%' }} />
  );

  const renderLabel = (plan: string) => (
    <Label color={plan === 'Free' ? 'default' : 'info'}>{plan}</Label>
  );

  return (
    <>
      <ButtonBase
        disableRipple
        sx={{
          pl: 2,
          py: 3,
          gap: 1.5,
          pr: 1.5,
          width: 1,
          borderRadius: 1.5,
          textAlign: 'left',
          justifyContent: 'flex-start',
          bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
          ...sx,
        }}
        {...other}
      >
        {/* {renderAvatar(workspace?.name, workspace?.logo)} */}

        <Box
          sx={{
            gap: 1,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            typography: 'body1',
            fontWeight: 'fontWeightSemiBold',
          }}
        >
          {user?.username}
          {renderLabel(user?.email || "")}
        </Box>
      </ButtonBase>
    </>
  );
}
