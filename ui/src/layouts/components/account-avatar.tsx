import { Avatar, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { getAvatarApiUsersUserIdAvatarGet } from "src/client";


const API_BASE_URL = import.meta.env.VITE_PROJECT_ENV == 'dev' ? import.meta.env.VITE_DEV_URL : import.meta.env.VITE_PROD_URL;

export const AccountAvatar = ({ handleOpenPopover, size, avatarFile, ...other }: any) => {
    const [avatarFileName, setAvatarFileName] = useState<string | null>();

    useEffect(() => {
        getAvatarApiUsersUserIdAvatarGet().then((response: any) => {
            setAvatarFileName(response.data);
        })
    }, []);

    return (
        <Avatar
            src={
                avatarFile
                    ? URL.createObjectURL(avatarFile)
                    : `${API_BASE_URL}/avatars/${avatarFileName}`
            }
            sx={{ width: size ?? 58, height: size ?? 58 }}
        />
        /*         <IconButton
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
                ></IconButton> */
    );
}