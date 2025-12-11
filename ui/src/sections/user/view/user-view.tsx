import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserTableHead } from '../user-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../user-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';

import type { UserProps } from '../user-table-row';
import { getUsersUsersGet, UserResponse } from 'src/client';
import { useEffect } from 'react';
import CreateUserModal from './create-user-modal';
import UpdateUserModal from './update-user-modal';
import { Snackbar, Alert } from '@mui/material';
import { useLocalStorage } from 'minimal-shared/hooks';
import { getLocalStorageItem } from 'src/services/local-storage-service';

// ----------------------------------------------------------------------

export function UserView() {
  const table = useTable();

  const [filterName, setFilterName] = useState('');
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateModalUser, setUpdateModalUser] = useState({} as UserProps);
  const [notification, setNotification] = useState({ open: false, message: '' });

  const currentUserRole = getLocalStorageItem('role');

  const handleUserCreated = (newUser: UserResponse) => {
    setNotification({
      open: true,
      message: `User "${newUser.username}" created successfully!`,
    });
    refreshUsers();
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getUsersUsersGet()
      .then((response) => {
        if (mounted) {
          setUsers(
            Array.isArray(response.data)
              ? response.data.map((user) => ({
                  ...user,
                  id: String(user.id),
                }))
              : []
          );
        }
      })
      .catch(() => {
        if (mounted) setUsers([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshUsers = () => {
    setLoading(true);
    getUsersUsersGet()
      .then((response) => {
        return setUsers(
          Array.isArray(response.data)
            ? response.data.map((user) => ({
                ...user,
                id: String(user.id),
              }))
            : []
        );
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleUpdateUser = (row: UserProps) => {
    setUpdateModalUser(row);
    setUpdateModalOpen(true);
  };

  const dataFiltered: UserProps[] = applyFilter({
    inputData: users,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  return (
    <DashboardContent>
      <Box
        sx={{
          mb: 5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Users
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setModalOpen(true)}
        >
          New user
        </Button>
      </Box>

      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      {updateModalOpen && (
        <UpdateUserModal
          open={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          user={updateModalUser}
          userId={Number(updateModalUser.id)}
          onUserUpdated={() => refreshUsers()}
        />
      )}

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <UserTableHead
                order={table.order}
                orderBy={table.orderBy}
                rowCount={users.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    users.map((user) => user.id)
                  )
                }
                headLabel={[
                  { id: 'username', label: 'Username' },
                  { id: 'email', label: 'Email' },
                  { id: 'role', label: 'Role' },
                  { id: 'inital_capital', label: 'Initial Capital', align: 'center' },
                  { id: '' },
                ]}
              />
              <TableBody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <Typography align="center">Loading...</Typography>
                    </td>
                  </tr>
                ) : (
                  dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <UserTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={(row) => handleUpdateUser(row)}
                        onDeleteRow={() => {
                          console.log('Row deleted');
                          refreshUsers();
                        }}
                        showActions={currentUserRole === 'admin'}
                      />
                    ))
                )}

                <TableEmptyRows
                  height={68}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, users.length)}
                />

                {notFound && <TableNoData searchQuery={filterName} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </Card>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity="success">{notification.message}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
// ----------------------------------------------------------------------

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    if (checked) {
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  }, []);

  const onSelectRow = useCallback(
    (inputValue: string) => {
      const newSelected = selected.includes(inputValue)
        ? selected.filter((value) => value !== inputValue)
        : [...selected, inputValue];

      setSelected(newSelected);
    },
    [selected]
  );

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      onResetPage();
    },
    [onResetPage]
  );

  return {
    page,
    order,
    onSort,
    orderBy,
    selected,
    rowsPerPage,
    onSelectRow,
    onResetPage,
    onChangePage,
    onSelectAllRows,
    onChangeRowsPerPage,
  };
}
