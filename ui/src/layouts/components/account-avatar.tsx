import { Avatar, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { getAvatarApiUsersUserIdAvatarGet } from "src/client";


const API_BASE_URL = import.meta.env.API_BASE_URL;

export const AccountAvatar = ({ handleOpenPopover, size, ...other }: any) => {
    const [avatarFileName, setAvatarFileName] = useState<string | null>();

    useEffect(() => {
        getAvatarApiUsersUserIdAvatarGet().then((response: any) => {
            setAvatarFileName(response.data);
        })
    }, []);

    return (
        <Avatar
            src={
                avatarFileName
                    ? `${API_BASE_URL}/uploads/avatars/${avatarFileName}`
                    : undefined
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