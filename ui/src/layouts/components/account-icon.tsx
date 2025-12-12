import { IconButton } from "@mui/material";

export const AccountIcon = ({ handleOpenPopover, sx = {}, ...other }: any) => {
    return (
        <IconButton
            onClick={handleOpenPopover}
            sx={{
                p: '2px',
                width: 40,
                height: 40,
                background: (theme) =>
                    `conic-gradient(${theme.vars.palette.primary.light}, ${theme.vars.palette.warning.light}, ${theme.vars.palette.primary.light})`,
                ...sx,
            }}
            {...other}
        ></IconButton>
    );
}